export type NotificationCategory = 'all' | 'snaps' | 'stories' | 'chats' | 'system';

export type NotificationType =
  | 'SNAP_RECEIVED'
  | 'SNAP_REPLY'
  | 'STORY_MENTION'
  | 'STORY_LIKED'
  | 'USER_FOLLOWED'
  | 'MESSAGE_RECEIVED'
  | 'FRIEND_REQUEST'
  | 'SYSTEM';

export type NotificationEntityType = 'snap' | 'story' | 'user' | 'chat';

export type NotificationActor = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type Notification = {
  id: string;
  type: NotificationType;
  category: Exclude<NotificationCategory, 'all'>;
  actor: NotificationActor | null;
  title: string;
  body: string;
  entityType?: NotificationEntityType;
  entityId?: string;
  readAt: string | null;
  createdAt: string;
};

export type NotificationPagination = {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
};

export type NotificationListResponse = {
  items: Notification[];
  pagination: NotificationPagination;
};

export type NotificationUnreadCountResponse = {
  count: number;
};

export type NotificationKind =
  | 'snap'
  | 'mention'
  | 'follow'
  | 'like'
  | 'system'
  | 'reply'
  | 'message'
  | 'friend_request';

export type NotificationEntry = {
  id: string;
  name: string;
  message: string;
  time: string;
  kind: NotificationKind;
  avatar: string | null;
  userId?: string;
  unread: boolean;
  type: NotificationType;
  category: Exclude<NotificationCategory, 'all'>;
  entityType?: NotificationEntityType;
  entityId?: string;
};
