import type { Types } from 'mongoose';

export type SnapMediaType = 'image' | 'video';
export type SnapRecipientStatus = 'sent' | 'opened';

export type SendSnapInput = {
  recipients: string[];
  mediaType: SnapMediaType;
  caption: string;
};

export type SnapPagination = {
  page: number;
  limit: number;
};

export type SafeSnapUser = {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type SnapRecipientState = {
  user: Types.ObjectId | SafeSnapUser;
  status: SnapRecipientStatus;
  openedAt: Date | null;
  replayUsed?: boolean;
};