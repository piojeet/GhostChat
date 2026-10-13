import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { getSocketClient } from '../../../services/socket/socketClient';
import { ApiError } from '../../../services/api/apiError';
import { useAuth } from '../../auth/hooks/useAuth';
import {
  deleteNotification as deleteNotificationRequest,
  getNotifications,
  getUnreadCount,
  markAllAsRead as markAllAsReadRequest,
  markAsRead as markAsReadRequest,
} from '../services/notificationService';
import type {
  Notification,
  NotificationCategory,
  NotificationEntry,
} from '../types/notification.types';
import { formatRelativeTime } from '../../../utils/date';

const PAGE_SIZE = 20;

const kindForType: Record<Notification['type'], NotificationEntry['kind']> = {
  SNAP_RECEIVED: 'snap',
  SNAP_REPLY: 'reply',
  STORY_MENTION: 'mention',
  STORY_LIKED: 'like',
  USER_FOLLOWED: 'follow',
  MESSAGE_RECEIVED: 'message',
  FRIEND_REQUEST: 'friend_request',
  SYSTEM: 'system',
};

const toNotificationEntry = (notification: Notification): NotificationEntry => ({
  id: notification.id,
  name: notification.title || notification.actor?.displayName || 'SnapApp',
  message: notification.body,
  time: formatRelativeTime(notification.createdAt),
  kind: kindForType[notification.type],
  avatar: notification.actor?.avatar ?? null,
  userId: notification.actor?.id,
  unread: notification.readAt === null,
  type: notification.type,
  category: notification.category,
  entityType: notification.entityType,
  entityId: notification.entityId,
});

const errorMessage = (error: unknown, action: string): string => {
  if (error instanceof ApiError) {
    switch (error.status) {
      case 401:
        return 'Your session has expired. Please sign in again.';
      case 403:
        return 'You do not have permission to view these notifications.';
      case 404:
        return 'This notification is no longer available.';
      case 429:
        return 'You are making requests too quickly. Please try again shortly.';
      case 503:
        return 'Notifications are temporarily unavailable. Please try again.';
      case 0:
        return 'Unable to connect. Check your internet connection and try again.';
      default:
        return `Unable to ${action}. Please try again.`;
    }
  }
  return `Unable to ${action}. Please try again.`;
};

export const useNotifications = (category: NotificationCategory) => {
  const { isAuthenticated, isRestoring } = useAuth();
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const requestVersion = useRef(0);
  const loadingMoreRef = useRef(false);
  const refreshingRef = useRef(false);
  const markingReadIdsRef = useRef(new Set<string>());
  const pageRef = useRef(1);
  const socket = getSocketClient();

  const loadNotifications = useCallback(async (isRefresh = false) => {
    if (!isAuthenticated || isRestoring) return;

    const version = requestVersion.current + 1;
    requestVersion.current = version;
    setError('');
    if (!isRefresh) setNotifications([]);
    pageRef.current = 1;
    setHasNextPage(false);
    loadingMoreRef.current = false;
    setLoadingMore(false);
    if (isRefresh) setRefreshing(true);
    else {
      setLoading(true);
      setRefreshing(false);
    }

    const [listResult, unreadResult] = await Promise.allSettled([
      getNotifications(category, 1, PAGE_SIZE),
      getUnreadCount(),
    ]);

    if (requestVersion.current !== version) return;

    if (listResult.status === 'fulfilled') {
      setNotifications(listResult.value.items.map(toNotificationEntry));
      setHasNextPage(listResult.value.pagination.hasNextPage);
    } else {
      const message = errorMessage(listResult.reason, 'load notifications');
      setError(message);
      if (isRefresh) {
        Alert.alert('Unable to refresh notifications', message);
      }
    }

    if (unreadResult.status === 'fulfilled') {
      setUnreadCount(unreadResult.value.count);
    } else {
      Alert.alert(
        'Unable to update unread count',
        errorMessage(unreadResult.reason, 'update unread count'),
      );
    }

    setLoading(false);
    setRefreshing(false);
  }, [category, isAuthenticated, isRestoring]);

  useFocusEffect(useCallback(() => {
    if (isAuthenticated && !isRestoring) {
      loadNotifications().catch(loadError => {
        setError(errorMessage(loadError, 'load notifications'));
        setLoading(false);
        setRefreshing(false);
      });
    } else if (!isRestoring) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
    }
    return () => {
      requestVersion.current += 1;
    };
  }, [isAuthenticated, isRestoring, loadNotifications]));

  useEffect(() => {
    const onNotification = (event: { category: string }) => {
      if (event.category === category && isAuthenticated && !isRestoring) {
        loadNotifications(true).catch(loadError => {
          setError(errorMessage(loadError, 'refresh notifications'));
          setRefreshing(false);
        });
      }
    };
    socket.on('notification:new', onNotification);
    return () => {
      socket.off('notification:new', onNotification);
    };
  }, [category, isAuthenticated, isRestoring, loadNotifications, socket]);

  const refresh = useCallback(() => {
    if (refreshingRef.current) return Promise.resolve();
    refreshingRef.current = true;
    return loadNotifications(true).finally(() => {
      refreshingRef.current = false;
    });
  }, [loadNotifications]);

  const loadMore = useCallback(async () => {
    if (!isAuthenticated || isRestoring || !hasNextPage || loadingMoreRef.current) return;

    const nextPage = pageRef.current + 1;
    const version = requestVersion.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const result = await getNotifications(category, nextPage, PAGE_SIZE);
      if (requestVersion.current !== version) return;
      setNotifications(current => {
        const existingIds = new Set(current.map(item => item.id));
        return [
          ...current,
          ...result.items
            .filter(item => !existingIds.has(item.id))
            .map(toNotificationEntry),
        ];
      });
      pageRef.current = nextPage;
      setHasNextPage(result.pagination.hasNextPage);
    } catch (loadError) {
      if (requestVersion.current === version) {
        Alert.alert('Unable to load more', errorMessage(loadError, 'load more notifications'));
      }
    } finally {
      if (requestVersion.current === version) {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    }
  }, [category, hasNextPage, isAuthenticated, isRestoring]);

  const markAsRead = useCallback(async (notificationId: string) => {
    const notification = notifications.find(item => item.id === notificationId);
    if (!notification?.unread || markingReadIdsRef.current.has(notificationId)) return;

    markingReadIdsRef.current.add(notificationId);
    setNotifications(current =>
      current.map(item =>
        item.id === notificationId ? { ...item, unread: false } : item,
      ),
    );
    setUnreadCount(current => Math.max(0, current - 1));
    try {
      await markAsReadRequest(notificationId);
    } catch (markError) {
      setNotifications(current =>
        current.map(item =>
          item.id === notificationId ? { ...item, unread: true } : item,
        ),
      );
      setUnreadCount(current => current + 1);
      Alert.alert(
        'Unable to mark notification as read',
        errorMessage(markError, 'mark notification as read'),
      );
    } finally {
      markingReadIdsRef.current.delete(notificationId);
    }
  }, [notifications]);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllAsReadRequest();
      setNotifications(current => current.map(item => ({ ...item, unread: false })));
      setUnreadCount(0);
    } catch (markError) {
      Alert.alert('Unable to mark notifications as read', errorMessage(markError, 'mark notifications as read'));
    }
  }, []);

  const deleteNotification = useCallback(async (notificationId: string) => {
    const notification = notifications.find(item => item.id === notificationId);
    if (!notification) return;
    try {
      await deleteNotificationRequest(notificationId);
      setNotifications(current => current.filter(item => item.id !== notificationId));
      if (notification.unread) {
        setUnreadCount(current => Math.max(0, current - 1));
      }
    } catch (deleteError) {
      Alert.alert('Unable to delete notification', errorMessage(deleteError, 'delete notification'));
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    hasNextPage,
    loading,
    loadingMore,
    refreshing,
    error,
    refresh,
    loadMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isAuthenticated,
    isRestoring,
  };
};
