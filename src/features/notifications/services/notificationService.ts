import { api } from '../../../services/api/apiClient';
import type {
  NotificationCategory,
  NotificationListResponse,
  NotificationUnreadCountResponse,
} from '../types/notification.types';

const PAGE_SIZE = 20;

export const getNotifications = (
  category: NotificationCategory = 'all',
  page = 1,
  limit = PAGE_SIZE,
): Promise<NotificationListResponse> =>
  api.request<NotificationListResponse>(
    `/notifications?category=${category}&page=${page}&limit=${limit}`,
  );

export const getUnreadCount = (): Promise<NotificationUnreadCountResponse> =>
  api.request<NotificationUnreadCountResponse>('/notifications/unread-count');

export const markAsRead = (notificationId: string): Promise<{ success: boolean }> =>
  api.request<{ success: boolean }>(`/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });

export const markAllAsRead = (): Promise<{ updated: number }> =>
  api.request<{ updated: number }>('/notifications/read-all', {
    method: 'PATCH',
  });

export const deleteNotification = (
  notificationId: string,
): Promise<{ success: boolean }> =>
  api.request<{ success: boolean }>(`/notifications/${notificationId}`, {
    method: 'DELETE',
  });