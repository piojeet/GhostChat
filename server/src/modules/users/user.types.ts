import type { Types } from 'mongoose';

export type ProfileUser = {
  _id: Types.ObjectId;
  username: string;
  email: string;
  displayName: string;
  avatar: string | null;
  gender: 'male' | 'female' | null;
  bio: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicProfileUser = Omit<ProfileUser, 'email' | 'updatedAt'>;

export type UpdateProfileInput = {
  displayName?: string;
  username?: string;
  bio?: string;
  gender?: 'male' | 'female' | null;
};

export type PaginationInput = {
  page: number;
  limit: number;
};

export type PaginatedItems<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

export type ProfileStats = {
  friends: number;
  stories: number;
  snaps: number;
};