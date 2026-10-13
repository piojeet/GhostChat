import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { getSocketClient } from '../../../services/socket/socketClient';
import { authStore } from '../../../store/authStore';
import { chatStore } from '../../../store/chatStore';
import { getChats } from '../services/chatService';
import type { ChatListResponse, ChatMessageNewEvent } from '../types/chat.types';
import type { MessageReceiptEvent } from '../types/message.types';

const PAGE_SIZE = 20;

export const useChat = () => {
  const { conversations } = useSyncExternalStore(
    chatStore.subscribe,
    chatStore.getState,
    chatStore.getState,
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const socket = getSocketClient();

  const loadPage = useCallback(async (requestedPage: number, append: boolean) => {
    if (append) setLoadingMore(true);
    else if (requestedPage === 1) setLoading(true);
    setError('');
    try {
      const result: ChatListResponse = await getChats(requestedPage, PAGE_SIZE);
      const nextConversations = append
        ? [
            ...chatStore.getState().conversations,
            ...result.items.filter(item =>
              !chatStore.getState().conversations.some(existing => existing.id === item.id),
            ),
          ]
        : result.items;
      chatStore.setConversations(nextConversations);
      setPage(requestedPage);
      setHasNextPage(result.pagination.hasNextPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load chats.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(1, false);
  }, [loadPage]);

  useFocusEffect(useCallback(() => {
    loadPage(1, false).catch(() => {
      setError('Unable to load chats. Please try again.');
    });
  }, [loadPage]));

  const loadMore = useCallback(() => {
    if (!hasNextPage || loadingMore) return;
    loadPage(page + 1, true).catch(() => {
      setError('Unable to load more chats.');
    });
  }, [hasNextPage, loadPage, loadingMore, page]);

  useEffect(() => {
    const onMessage = (event: ChatMessageNewEvent) => {
      chatStore.upsertMessage(
        event.chatId,
        event.message,
        authStore.getState().user?.id,
      );
    };
    const onReadReceipt = (receipt: MessageReceiptEvent) => {
      if (receipt.status === 'read' && receipt.recipientId === authStore.getState().user?.id) {
        chatStore.markRead(receipt.chatId);
      }
    };
    const onReconnect = () => {
      loadPage(1, false).catch(() => {
        setError('Unable to refresh chats after reconnecting.');
      });
    };
    socket.on('message:new', onMessage);
    socket.on('message:read_receipt', onReadReceipt);
    socket.on('connect', onReconnect);
    return () => {
      socket.off('message:new', onMessage);
      socket.off('message:read_receipt', onReadReceipt);
      socket.off('connect', onReconnect);
    };
  }, [loadPage, socket]);

  return {
    conversations,
    loading,
    refreshing,
    loadingMore,
    error,
    hasNextPage,
    refresh,
    loadMore,
  };
};