import type { SafeUser, PaginatedResponse } from '../../friends/types/friend.types';

export type Story = {
  id: string;
  user: SafeUser;
  media: string;
  mediaType: 'image' | 'video';
  caption: string;
  visibility: 'public' | 'friends';
  createdAt: string;
  expiresAt: string;
  hasViewed?: boolean;
};

export type StoryPage = PaginatedResponse<Story>;
export type StoryResponse = { story: Story };