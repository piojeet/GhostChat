export const notificationTypes = [
  'SNAP_RECEIVED',
  'SNAP_REPLY',
  'STORY_MENTION',
  'STORY_LIKED',
  'USER_FOLLOWED',
  'MESSAGE_RECEIVED',
  'SYSTEM',
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type NotificationCategory = 'all' | 'snaps' | 'stories' | 'chats' | 'system';
export type NotificationEntityType = 'snap' | 'story' | 'chat';

export type SafeNotificationActor = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type NotificationItem = {
  id: string;
  type: NotificationType;
  category: Exclude<NotificationCategory, 'all'>;
  actor: SafeNotificationActor | null;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  readAt: Date | null;
  createdAt: Date;
};

export type NotificationListResponse = {
  items: NotificationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};
