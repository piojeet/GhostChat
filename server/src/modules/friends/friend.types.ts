import type { Types } from 'mongoose';
import type { PaginationInput } from '../users/user.types';

export type FriendStatus = 'pending' | 'accepted' | 'declined';
export type RelationshipStatus =
  | 'none'
  | 'friends'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'blocked';

export type SafeFriendUser = {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  avatar: string | null;
  gender?: 'male' | 'female' | null;
};

export type FriendRequestInput = {
  userId: string;
};

export type FriendListInput = PaginationInput;

export type Paginated<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};