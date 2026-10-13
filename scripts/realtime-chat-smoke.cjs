const { io } = require('socket.io-client');

const apiBaseUrl = (process.env.API_BASE_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
const socketUrl = process.env.SOCKET_URL || new URL(apiBaseUrl).origin;
const userAAccessToken = process.env.USER_A_ACCESS_TOKEN;
const userBAccessToken = process.env.USER_B_ACCESS_TOKEN;
const userBId = process.env.USER_B_ID;
const timeoutMs = Number(process.env.REALTIME_TEST_TIMEOUT_MS || 15000);
const sockets = [];
const timers = new Set();

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const request = async (path, token, options = {}) => {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });
  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error(`REST ${path} returned invalid JSON (HTTP ${response.status})`);
  }
  if (!response.ok) {
    const message = body?.error?.message || `HTTP ${response.status}`;
    throw new Error(`REST ${path} failed: ${message}`);
  }
  return body;
};

const waitFor = (socket, eventName, predicate, step) =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for ${step}`));
    }, timeoutMs);
    timers.add(timeout);

    const onEvent = payload => {
      if (!predicate(payload)) return;
      cleanup();
      resolve(payload);
    };
    const onError = error => {
      cleanup();
      const reason = error?.data?.message || error?.message || 'socket event failed';
      reject(new Error(`${step}: ${reason}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      timers.delete(timeout);
      socket.off(eventName, onEvent);
      socket.off('connect_error', onError);
      socket.off('message:error', onError);
    };
    socket.on(eventName, onEvent);
    socket.on('connect_error', onError);
    socket.on('message:error', onError);
  });

const connect = socket =>
  new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out connecting authenticated socket'));
    }, timeoutMs);
    timers.add(timeout);
    const onConnect = () => {
      cleanup();
      resolve();
    };
    const onError = error => {
      cleanup();
      const reason = error?.data?.message || error?.message || 'authentication failed';
      reject(new Error(`Socket authentication failed: ${reason}`));
    };
    const cleanup = () => {
      clearTimeout(timeout);
      timers.delete(timeout);
      socket.off('connect', onConnect);
      socket.off('connect_error', onError);
    };
    socket.once('connect', onConnect);
    socket.once('connect_error', onError);
    socket.connect();
  });

const createSocket = accessToken => {
  const socket = io(socketUrl, {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: { accessToken },
  });
  sockets.push(socket);
  return socket;
};

const run = async () => {
  assert(userAAccessToken, 'Set USER_A_ACCESS_TOKEN in the environment.');
  assert(userBAccessToken, 'Set USER_B_ACCESS_TOKEN in the environment.');
  assert(userBId, 'Set USER_B_ID in the environment.');
  assert(Number.isFinite(timeoutMs) && timeoutMs > 0, 'REALTIME_TEST_TIMEOUT_MS must be positive.');

  console.log('Step 1/7: creating or retrieving the authorized conversation');
  const chatResult = await request('/chats', userAAccessToken, {
    method: 'POST',
    body: JSON.stringify({ userId: userBId }),
  });
  const chatId = chatResult?.chat?.id;
  assert(typeof chatId === 'string', 'Create-chat response did not include chat.id.');

  console.log('Step 2/7: connecting both authenticated users');
  const userA = createSocket(userAAccessToken);
  const userB = createSocket(userBAccessToken);
  await Promise.all([connect(userA), connect(userB)]);

  console.log('Step 3/7: joining the authorized chat from both users');
  const joinedA = waitFor(userA, 'chat:joined', event => event.chatId === chatId, 'User A chat join');
  const joinedB = waitFor(userB, 'chat:joined', event => event.chatId === chatId, 'User B chat join');
  userA.emit('chat:join', { chatId });
  userB.emit('chat:join', { chatId });
  await Promise.all([joinedA, joinedB]);

  console.log('Step 4/7: verifying typing reaches the other participant');
  const typingReceived = waitFor(
    userB,
    'typing:start',
    event => event.chatId === chatId && event.userId !== userBId,
    'typing:start delivery to User B',
  );
  userA.emit('typing:start', { chatId });
  await typingReceived;
  userA.emit('typing:stop', { chatId });

  const messageText = `realtime-smoke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  console.log('Step 5/7: verifying persisted message delivery');
  const newMessageReceived = waitFor(
    userB,
    'message:new',
    event => event.chatId === chatId && event.message?.text === messageText,
    'new message delivery to User B',
  );
  userA.emit('message:send', { chatId, text: messageText });
  const newMessageEvent = await newMessageReceived;
  const messageId = newMessageEvent.message.id;
  assert(typeof messageId === 'string', 'Realtime message did not contain a persisted message ID.');

  const history = await request(`/chats/${chatId}/messages?page=1&limit=50`, userBAccessToken);
  const persistedMessage = history.items?.find(message => message.id === messageId);
  assert(
    persistedMessage?.text === messageText,
    'The realtime message was not found in REST message history.',
  );

  console.log('Step 6/7: marking messages read as User B');
  const readReceiptReceived = waitFor(
    userA,
    'message:read_receipt',
    event =>
      event.chatId === chatId &&
      event.messageId === messageId &&
      event.recipientId === userBId &&
      event.status === 'read',
    'persisted read receipt for User A',
  );
  userB.emit('message:read', { chatId });
  const readReceipt = await readReceiptReceived;

  console.log('Step 7/7: verifying the read receipt in REST history');
  const verifiedHistory = await request(
    `/chats/${chatId}/messages?page=1&limit=50`,
    userBAccessToken,
  );
  const verifiedMessage = verifiedHistory.items?.find(message => message.id === messageId);
  const persistedReceipt = verifiedMessage?.receipts?.find(
    receipt => receipt.recipientId === userBId,
  );
  assert(
    Boolean(persistedReceipt?.readAt),
    'The read receipt event arrived but the receipt was not persisted in MongoDB.',
  );
  assert(
    new Date(persistedReceipt.readAt).getTime() <= new Date(readReceipt.at).getTime(),
    'The emitted read receipt timestamp predates the persisted read state.',
  );

  console.log('PASS: authorized joins, typing, message persistence/delivery, and persisted read receipt verified.');
};

run()
  .catch(error => {
    console.error(`FAIL: ${error instanceof Error ? error.message : 'Realtime smoke test failed.'}`);
    process.exitCode = 1;
  })
  .finally(() => {
    timers.forEach(timer => clearTimeout(timer));
    sockets.forEach(socket => socket.disconnect());
  });
