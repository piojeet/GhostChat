import type { Types } from 'mongoose';

export type StoryMediaType = 'image' | 'video';
export type StoryVisibility = 'public' | 'friends';

export type StoryPagination = {
  page: number;
  limit: number;
};

export type CreateStoryInput = {
  mediaType: StoryMediaType;
  caption?: string;
  visibility: StoryVisibility;
};

export type SafeStoryUser = {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type StoryItem = {
  _id: Types.ObjectId;
  user: SafeStoryUser;
  media: string;
  mediaType: StoryMediaType;
  caption: string;
  visibility: StoryVisibility;
  createdAt: Date;
  expiresAt: Date;
};

export type PaginatedStories<T> = {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};