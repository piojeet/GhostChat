import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { friendService } from '../modules/friends/friend.service';
import { chatService } from '../modules/chat/chat.service';
import { messageService } from '../modules/messages/message.service';
import { publishMessage, publishReadReceipts } from '../modules/chat/chat.realtime';
import { HttpError } from '../utils/httpError';
import {
  chatRoom,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
  userRoom,
} from './socketEvents';

type SocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const chatPayloadSchema = z
  .object({ chatId: objectIdSchema.transform(id => id.toLowerCase()) })
  .strict();
const sendPayloadSchema = z
  .object({
    chatId: objectIdSchema.transform(id => id.toLowerCase()),
    text: z.string().trim().min(1).max(5000),
    replyToId: objectIdSchema.optional(),
  })
  .strict();

// Process-local presence resets on restart and requires shared storage for multiple instances.
const onlineSockets = new Map<string, Set<string>>();
const typingChatsBySocket = new Map<string, Set<string>>();
const typingSocketsByChatUser = new Map<string, Set<string>>();

const emitError = (
  socket: AuthenticatedSocket,
  error: unknown,
  chatId?: string,
): void => {
  if (error instanceof HttpError) {
    socket.emit('message:error', {
      code: error.code ?? 'REQUEST_ERROR',
      message: error.message,
      ...(chatId ? { chatId } : {}),
    });
    return;
  }
  if (error instanceof z.ZodError) {
    socket.emit('message:error', {
      code: 'VALIDATION_ERROR',
      message: error.issues[0]?.message ?? 'Invalid socket event payload',
      ...(chatId ? { chatId } : {}),
    });
    return;
  }
  socket.emit('message:error', {
    code: 'INTERNAL_ERROR',
    message: 'Unable to process chat event',
    ...(chatId ? { chatId } : {}),
  });
};

const emitPresenceToFriends = async (
  io: SocketServer,
  userId: string,
  event: 'user:online' | 'user:offline',
): Promise<void> => {
  const isOnline = (onlineSockets.get(userId)?.size ?? 0) > 0;
  if ((event === 'user:online') !== isOnline) return;
  const friendIds = await friendService.getFriendIds(userId);
  if (((onlineSockets.get(userId)?.size ?? 0) > 0) !== isOnline) return;
  friendIds.forEach(friendId => {
    io.to(userRoom(friendId)).emit(event, { userId });
  });
};

const emitTyping = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
  event: 'typing:start' | 'typing:stop',
): Promise<void> => {
  const { chatId } = chatPayloadSchema.parse(payload);
  const { otherUserId } = await chatService.assertAccess(chatId, socket.data.userId);
  if (!socket.rooms.has(chatRoom(chatId))) {
    throw new HttpError(403, 'Join the chat before sending typing events', 'CHAT_NOT_JOINED');
  }
  const typingChats = typingChatsBySocket.get(socket.id) ?? new Set<string>();
  const typingKey = `${chatId}:${socket.data.userId}`;
  const activeTypingSockets = typingSocketsByChatUser.get(typingKey) ?? new Set<string>();
  if (event === 'typing:start') {
    const shouldNotify = activeTypingSockets.size === 0;
    activeTypingSockets.add(socket.id);
    typingSocketsByChatUser.set(typingKey, activeTypingSockets);
    typingChats.add(chatId);
    typingChatsBySocket.set(socket.id, typingChats);
    if (shouldNotify) {
      io.to(userRoom(otherUserId)).emit(event, {
        chatId,
        userId: socket.data.userId,
      });
    }
  } else {
    activeTypingSockets.delete(socket.id);
    if (activeTypingSockets.size === 0) {
      typingSocketsByChatUser.delete(typingKey);
      io.to(userRoom(otherUserId)).emit(event, {
        chatId,
        userId: socket.data.userId,
      });
    }
    typingChats.delete(chatId);
    if (typingChats.size === 0) typingChatsBySocket.delete(socket.id);
  }
};

const stopTypingForChat = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  chatId: string,
): Promise<void> => {
  const typingChats = typingChatsBySocket.get(socket.id);
  if (!typingChats?.has(chatId)) return;
  typingChats.delete(chatId);
  if (typingChats.size === 0) typingChatsBySocket.delete(socket.id);
  const typingKey = `${chatId}:${socket.data.userId}`;
  const activeTypingSockets = typingSocketsByChatUser.get(typingKey);
  activeTypingSockets?.delete(socket.id);
  const shouldNotify = activeTypingSockets?.size === 0;
  if (shouldNotify) typingSocketsByChatUser.delete(typingKey);
  try {
    const { otherUserId } = await chatService.assertAccess(chatId, socket.data.userId);
    if (shouldNotify) {
      io.to(userRoom(otherUserId)).emit('typing:stop', {
        chatId,
        userId: socket.data.userId,
      });
    }
  } catch (error) {
    console.error('Unable to authorize typing-stop event', { chatId });
    if (!(error instanceof HttpError)) {
      console.error('Typing-stop authorization check failed unexpectedly');
    }
  }
};

const handleJoin = async (
  socket: AuthenticatedSocket,
  payload: unknown,
): Promise<void> => {
  const { chatId } = chatPayloadSchema.parse(payload);
  const { otherUserId } = await chatService.assertAccess(chatId, socket.data.userId);
  await socket.join(chatRoom(chatId));
  if ((onlineSockets.get(otherUserId)?.size ?? 0) > 0) {
    socket.emit('user:online', { userId: otherUserId });
  }
  socket.emit('chat:joined', { chatId });
};

const handleLeave = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
): Promise<void> => {
  const { chatId } = chatPayloadSchema.parse(payload);
  await stopTypingForChat(io, socket, chatId);
  await socket.leave(chatRoom(chatId));
  socket.emit('chat:left', { chatId });
};

const handleSend = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
): Promise<void> => {
  const parsed = sendPayloadSchema.parse(payload);
  const { chatId } = parsed;
  await chatService.assertAccess(chatId, socket.data.userId);
  if (!socket.rooms.has(chatRoom(chatId))) {
    throw new HttpError(403, 'Join the chat before sending messages', 'CHAT_NOT_JOINED');
  }

  const result = await messageService.send(chatId, socket.data.userId, {
    text: parsed.text,
    ...(parsed.replyToId ? { replyToId: parsed.replyToId } : {}),
  });
  await publishMessage(io, chatId, result.message);
  if (result.notificationCreated) {
    const recipientId = result.message.receipts[0]?.recipientId;
    if (recipientId) {
      io.to(userRoom(recipientId)).emit('notification:new', {
        category: 'chats',
        entityId: chatId,
      });
    }
  }
};

const handleRead = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
): Promise<void> => {
  const { chatId } = chatPayloadSchema.parse(payload);
  await chatService.assertAccess(chatId, socket.data.userId);
  if (!socket.rooms.has(chatRoom(chatId))) {
    throw new HttpError(403, 'Join the chat before marking messages read', 'CHAT_NOT_JOINED');
  }
  const { receipts, readAt } = await messageService.markConversationReadWithReceipts(
    chatId,
    socket.data.userId,
  );
  publishReadReceipts(io, chatId, socket.data.userId, receipts, readAt);
};

export const registerChatSocket = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
): Promise<void> => {
  const userId = socket.data.userId;
  const userSockets = onlineSockets.get(userId) ?? new Set<string>();
  const wasOffline = userSockets.size === 0;
  userSockets.add(socket.id);
  onlineSockets.set(userId, userSockets);

  socket.on('chat:join', payload => {
    handleJoin(socket, payload).catch(error => emitError(socket, error));
  });
  socket.on('chat:leave', payload => {
    handleLeave(io, socket, payload).catch(error => emitError(socket, error));
  });
  socket.on('message:send', payload => {
    const chatId = typeof payload?.chatId === 'string' ? payload.chatId : undefined;
    handleSend(io, socket, payload).catch(error => emitError(socket, error, chatId));
  });
  socket.on('message:read', payload => {
    const chatId = typeof payload?.chatId === 'string' ? payload.chatId : undefined;
    handleRead(io, socket, payload).catch(error => emitError(socket, error, chatId));
  });
  socket.on('typing:start', payload => {
    const chatId = typeof payload?.chatId === 'string' ? payload.chatId : undefined;
    emitTyping(io, socket, payload, 'typing:start').catch(error =>
      emitError(socket, error, chatId),
    );
  });
  socket.on('typing:stop', payload => {
    const chatId = typeof payload?.chatId === 'string' ? payload.chatId : undefined;
    emitTyping(io, socket, payload, 'typing:stop').catch(error =>
      emitError(socket, error, chatId),
    );
  });

  socket.on('disconnecting', () => {
    const typingChats = [...(typingChatsBySocket.get(socket.id) ?? [])];
    typingChats.forEach(chatId => {
      stopTypingForChat(io, socket, chatId).catch(() => {
        console.error('Unable to stop typing activity on disconnect', { chatId });
      });
    });
  });
  socket.on('disconnect', () => {
    const typingChats = typingChatsBySocket.get(socket.id);
    typingChatsBySocket.delete(socket.id);
    if (typingChats) {
      typingChats.forEach(chatId => {
        stopTypingForChat(io, socket, chatId).catch(() => {
          console.error('Unable to stop typing activity after disconnect', { chatId });
        });
      });
    }
    const activeSockets = onlineSockets.get(userId);
    activeSockets?.delete(socket.id);
    if (activeSockets?.size === 0) {
      onlineSockets.delete(userId);
      emitPresenceToFriends(io, userId, 'user:offline').catch(() => {
        console.error('Unable to update chat presence after disconnect');
      });
    }
  });

  try {
    const friendIds = await friendService.getFriendIds(userId);
    if (!onlineSockets.get(userId)?.has(socket.id)) return;
    friendIds.forEach(friendId => {
      if ((onlineSockets.get(friendId)?.size ?? 0) > 0) {
        socket.emit('user:online', { userId: friendId });
      }
    });
    if (wasOffline) await emitPresenceToFriends(io, userId, 'user:online');
  } catch {
    console.error('Unable to load friend chat presence', { userId });
  }
};