import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getSocketClient } from '../../../services/socket/socketClient';
import { authStore } from '../../../store/authStore';
import { chatStore } from '../../../store/chatStore';
import { createOrGetChat, markChatAsRead } from '../services/chatService';
import {
  getMessages,
  sendMediaMessage as sendMediaMessageRequest,
  sendMessage as sendMessageRequest,
  type MessageMediaUpload,
} from '../services/messageService';
import { playOutgoingMessageSound } from '../../../services/notifications/notificationSounds';
import type { ChatConversation } from '../types/chat.types';
import type { ChatMessage, MessageReceiptEvent } from '../types/message.types';

const PAGE_SIZE = 50;

const sortMessages = (messages: ChatMessage[]): ChatMessage[] =>
  [...messages].sort(
    (first, second) =>
      new Date(first.sentAt).getTime() - new Date(second.sentAt).getTime() ||
      first.id.localeCompare(second.id),
  );

const mergeMessages = (
  existing: ChatMessage[],
  incoming: ChatMessage[],
): ChatMessage[] => {
  const merged = new Map(existing.map(message => [message.id, message]));
  incoming.forEach(message => merged.set(message.id, message));
  return sortMessages([...merged.values()]);
};

export const useMessages = (
  userId: string,
  name: string,
  routeChatId?: string,
) => {
  const socket = getSocketClient();
  const [conversation, setConversation] = useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sendError, setSendError] = useState('');
  const sendingRef = useRef(false);
  const [joined, setJoined] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [hasOlder, setHasOlder] = useState(false);
  const pageRef = useRef(1);
  const focusedRef = useRef(false);
  const currentUserId = authStore.getState().user?.id;
  const chatId = conversation?.id ?? routeChatId ?? null;

  const loadMessages = useCallback(async (
    targetChatId: string,
    requestedPage = 1,
    append = false,
  ) => {
    if (append) setLoadingOlder(true);
    else if (requestedPage === 1) setLoading(true);
    setError('');
    try {
      const response = await getMessages(targetChatId, requestedPage, PAGE_SIZE);
      setMessages(current =>
        append
          ? mergeMessages(current, response.items)
          : sortMessages(response.items),
      );
      pageRef.current = requestedPage;
      setHasOlder(response.pagination.hasNextPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load messages.');
    } finally {
      setLoading(false);
      setLoadingOlder(false);
    }
  }, []);

  const refreshHistory = useCallback(async () => {
    if (!chatId) return;
    await loadMessages(chatId);
  }, [chatId, loadMessages]);

  const retry = useCallback(async () => {
    if (chatId) {
      await loadMessages(chatId);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setConversation(await createOrGetChat(userId));
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Unable to open chat.');
    } finally {
      setLoading(false);
    }
  }, [chatId, loadMessages, userId]);

  useEffect(() => {
    let active = true;
    if (routeChatId) {
      setConversation({
        id: routeChatId,
        chatId: routeChatId,
        participant: {
          id: userId,
          username: '',
          displayName: name,
          avatar: null,
          gender: null,
        },
        lastMessage: null,
        unreadCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return () => {
        active = false;
      };
    }
    createOrGetChat(userId)
      .then(created => {
        if (active) setConversation(created);
      })
      .catch(createError => {
        if (active) {
          setError(createError instanceof Error ? createError.message : 'Unable to open chat.');
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [name, routeChatId, userId]);

  const markRead = useCallback(async (targetChatId: string) => {
    await markChatAsRead(targetChatId);
    chatStore.markRead(targetChatId);
    await loadMessages(targetChatId, 1, false);
  }, [loadMessages]);

  useFocusEffect(useCallback(() => {
    focusedRef.current = true;
    if (!chatId) return () => {
      focusedRef.current = false;
    };

    const join = () => {
      socket.emit('chat:join', { chatId });
      loadMessages(chatId).catch(() => {
        setError('Unable to refresh conversation.');
      });
    };
    const onJoined = (event: { chatId: string }) => {
      if (event.chatId !== chatId) return;
      setJoined(true);
      markRead(chatId).catch(readError => {
        setError(readError instanceof Error ? readError.message : 'Unable to mark messages as read.');
      });
    };
    const onLeft = (event: { chatId: string }) => {
      if (event.chatId === chatId) setJoined(false);
    };
    const onMessage = (event: { chatId: string; message: ChatMessage }) => {
      if (event.chatId !== chatId) return;
      setMessages(current => mergeMessages(current, [event.message]));
      chatStore.upsertMessage(chatId, event.message, currentUserId);
      if (
        focusedRef.current &&
        event.message.senderId !== currentUserId
      ) {
        markRead(chatId).catch(readError => {
          setError(readError instanceof Error ? readError.message : 'Unable to mark messages as read.');
        });
      }
    };
    const onReceipt = (receipt: MessageReceiptEvent) => {
      if (receipt.chatId !== chatId) return;
      setMessages(current => current.map(message => {
        if (message.id !== receipt.messageId) return message;
        return {
          ...message,
          receipts: message.receipts.map(item =>
            item.recipientId === receipt.recipientId
              ? {
                  ...item,
                  deliveredAt: receipt.status === 'delivered' ? receipt.at : item.deliveredAt,
                  readAt: receipt.status === 'read' ? receipt.at : item.readAt,
                }
              : item,
          ),
        };
      }));
    };
    const onOnline = (event: { userId: string }) => {
      if (event.userId === userId) setIsOnline(true);
    };
    const onOffline = (event: { userId: string }) => {
      if (event.userId === userId) setIsOnline(false);
    };
    const onSocketError = (event: { message: string; chatId?: string }) => {
      if (!event.chatId || event.chatId === chatId) setError(event.message);
    };

    socket.on('chat:joined', onJoined);
    socket.on('chat:left', onLeft);
    socket.on('message:new', onMessage);
    socket.on('message:read_receipt', onReceipt);
    socket.on('user:online', onOnline);
    socket.on('user:offline', onOffline);
    socket.on('message:error', onSocketError);
    socket.on('connect', join);
    if (socket.connected) join();

    return () => {
      focusedRef.current = false;
      socket.emit('typing:stop', { chatId });
      socket.emit('chat:leave', { chatId });
      socket.off('chat:joined', onJoined);
      socket.off('chat:left', onLeft);
      socket.off('message:new', onMessage);
      socket.off('message:read_receipt', onReceipt);
      socket.off('user:online', onOnline);
      socket.off('user:offline', onOffline);
      socket.off('message:error', onSocketError);
      socket.off('connect', join);
      setJoined(false);
    };
  }, [chatId, currentUserId, loadMessages, markRead, socket, userId]));

  const sendMessage = useCallback(async (text: string) => {
    const trimmedText = text.trim();
    if (!chatId || !trimmedText || sendingRef.current) return false;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    try {
      const response = await sendMessageRequest(chatId, trimmedText);
      setMessages(current => mergeMessages(current, [response.message]));
      chatStore.upsertMessage(chatId, response.message, currentUserId);
      playOutgoingMessageSound();
      return true;
    } catch (sendFailure) {
      setSendError(sendFailure instanceof Error ? sendFailure.message : 'Unable to send message.');
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [chatId, currentUserId]);

  const sendMediaMessage = useCallback(async (media: MessageMediaUpload) => {
    if (!chatId || sendingRef.current) return false;
    sendingRef.current = true;
    setSending(true);
    setSendError('');
    try {
      const response = await sendMediaMessageRequest(chatId, media);
      setMessages(current => mergeMessages(current, [response.message]));
      chatStore.upsertMessage(chatId, response.message, currentUserId);
      playOutgoingMessageSound();
      return true;
    } catch (sendFailure) {
      setSendError(sendFailure instanceof Error ? sendFailure.message : 'Unable to send attachment.');
      return false;
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [chatId, currentUserId]);

  const loadOlder = useCallback(() => {
    if (!chatId || !hasOlder || loadingOlder) return;
    loadMessages(chatId, pageRef.current + 1, true).catch(() => {
      setError('Unable to load older messages.');
    });
  }, [chatId, hasOlder, loadMessages, loadingOlder]);

  useEffect(() => {
    if (chatId) {
      const existing = chatStore.getState().conversations.find(item => item.id === chatId);
      if (existing) setConversation(existing);
    }
  }, [chatId]);

  return {
    conversation,
    chatId,
    messages,
    loading,
    loadingOlder,
    sending,
    error,
    sendError,
    joined,
    isOnline,
    hasOlder,
    sendMessage,
    sendMediaMessage,
    loadOlder,
    refreshHistory,
    retry,
  };
};