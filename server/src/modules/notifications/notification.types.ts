export const notificationTypes = [
  'SNAP_RECEIVED',
  'SNAP_REPLY',
  'STORY_MENTION',
  'STORY_LIKED',
  'USER_FOLLOWED',
  'MESSAGE_RECEIVED',
  'FRIEND_REQUEST',
  'SYSTEM',
] as const;

export type NotificationType = (typeof notificationTypes)[number];
export type ActorNotificationType = Exclude<NotificationType, 'SYSTEM'>;

export const notificationCategories = ['snaps', 'stories', 'chats', 'system'] as const;
export type NotificationCategory = (typeof notificationCategories)[number];
export type NotificationCategoryFilter = 'all' | NotificationCategory;

export type NotificationEntityType = 'snap' | 'story' | 'chat' | 'user';

export type SafeNotificationActor = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type NotificationResponse = {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  actor: SafeNotificationActor | null;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  readAt: Date | null;
  createdAt: Date;
};

export type CreateActorNotificationInput = {
  recipientId: string;
  actorId: string;
  type: ActorNotificationType;
  entityType?: NotificationEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
  eventKey?: string;
  messagePreview?: string;
};

export type CreateSystemNotificationInput = {
  recipientId: string;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  metadata?: Record<string, unknown>;
};