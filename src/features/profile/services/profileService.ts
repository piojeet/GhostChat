import { api } from '../../../services/api/apiClient';
import type { PaginatedResponse } from '../../friends/types/friend.types';
import type {
  ProfileResponse,
  ProfileStatsResponse,
  ProfileUpdateInput,
  ProfileUser,
  PublicProfileUser,
  ProfileSnap,
} from '../types/profile.types';
import type { Story } from '../../stories/types/story.types';

export const getMyProfile = async (): Promise<ProfileUser> =>
  (await api.request<ProfileResponse>('/users/me')).user;

export const getPublicProfile = async (username: string): Promise<PublicProfileUser> =>
  (await api.request<{ user: PublicProfileUser }>(
    `/users/${encodeURIComponent(username)}`,
  )).user;

export const getProfileStats = async (): Promise<ProfileStatsResponse['stats']> =>
  (await api.request<ProfileStatsResponse>('/users/me/stats')).stats;

export const getProfileSnaps = (page = 1, limit = 20) =>
  api.request<PaginatedResponse<ProfileSnap>>(
    `/users/me/snaps?page=${page}&limit=${limit}`,
  );

export const getProfileStories = (page = 1, limit = 20) =>
  api.request<PaginatedResponse<Story>>(
    `/users/me/stories?page=${page}&limit=${limit}`,
  );

export const updateMyProfile = async (
  changes: ProfileUpdateInput,
): Promise<ProfileUser> =>
  (await api.request<ProfileResponse>('/users/me', {
    method: 'PATCH',
    body: changes,
  })).user;

export const uploadMyAvatar = async (
  uri: string,
  mimeType: string,
  fileName: string,
): Promise<ProfileUser> => {
  const form = new FormData();
  form.append('avatar', { uri, type: mimeType, name: fileName } as unknown as Blob);
  return (await api.request<ProfileResponse>('/users/me/avatar', {
    method: 'POST',
    body: form,
  })).user;
};
