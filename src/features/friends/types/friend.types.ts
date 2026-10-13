export type SafeUser = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  gender?: 'male' | 'female' | null;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: Pagination;
};

export type FriendItem = {
  id: string;
  user: SafeUser;
  friendsSince: string;
};

export type FriendRequestItem = {
  id: string;
  user: SafeUser;
  createdAt: string;
};

export type FriendStatus =
  | 'none'
  | 'friends'
  | 'outgoing_pending'
  | 'incoming_pending'
  | 'blocked';

export type SearchUser = SafeUser;

export type FriendSuggestion = SafeUser & {
  joinedAt: string;
};