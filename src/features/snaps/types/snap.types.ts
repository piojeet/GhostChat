import type { SafeUser, PaginatedResponse } from '../../friends/types/friend.types';

export type SnapRecipient = {
  user: SafeUser;
  status: 'sent' | 'opened';
  openedAt: string | null;
};

export type SnapInboxItem = {
  id: string;
  sender: SafeUser;
  mediaType: 'image' | 'video';
  createdAt: string;
  expiresAt: string;
  opened: boolean;
  replayAvailable: boolean;
};

export type SentSnap = {
  id: string;
  recipients: SnapRecipient[];
  mediaType: 'image' | 'video';
  caption: string;
  createdAt: string;
  expiresAt: string;
};

export type OpenedSnap = {
  id: string;
  sender: SafeUser;
  media: string;
  mediaType: 'image' | 'video';
  caption: string;
  createdAt: string;
  expiresAt: string;
  openedAt: string | null;
  replayAvailable: boolean;
};

export type SnapDetails = {
  id: string;
  sender: SafeUser;
  recipients?: SnapRecipient[];
  mediaType: 'image' | 'video';
  caption: string;
  createdAt: string;
  expiresAt: string;
  opened?: boolean;
  mediaAvailable: false;
};

export type SnapPage<T> = PaginatedResponse<T>;