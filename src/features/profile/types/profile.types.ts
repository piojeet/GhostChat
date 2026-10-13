import type { SafeUser } from '../../friends/types/friend.types';

export type ProfileUser = SafeUser & {
  email: string;
  bio: string;
  createdAt: string;
  updatedAt: string;
};

export type ProfileResponse = { user: ProfileUser };

export type PublicProfileUser = Pick<
  ProfileUser,
  'id' | 'username' | 'displayName' | 'avatar' | 'gender' | 'bio' | 'createdAt'
>;

export type ProfileStats = {
  friends: number;
  stories: number;
  snaps: number;
};

export type ProfileStatsResponse = { stats: ProfileStats };

export type ProfileUpdateInput = {
  displayName?: string;
  username?: string;
  bio?: string;
  gender?: 'male' | 'female' | null;
};

export type ProfileSnap = {
  id: string;
  mediaType: 'image' | 'video';
  caption: string;
  createdAt: string;
  expiresAt: string;
  recipients: Array<{
    user: SafeUser;
    status: 'sent' | 'opened';
    openedAt: string | null;
  }>;
};