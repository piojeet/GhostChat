import { api } from '../../../services/api/apiClient';
import type { SafeUser } from '../../friends/types/friend.types';

export type LocationPreferences = {
  sharingEnabled: boolean;
  ghostMode: boolean;
  lastUpdatedAt: string | null;
};

export type SharedFriendLocation = {
  user: SafeUser;
  latitude: number;
  longitude: number;
  lastUpdatedAt: string;
  isStale: boolean;
};

export const getLocationPreferences = async (): Promise<LocationPreferences> =>
  (await api.request<{ preferences: LocationPreferences }>('/locations/me/preferences'))
    .preferences;

export const updateLocationPreferences = async (
  sharingEnabled: boolean,
  ghostMode: boolean,
): Promise<LocationPreferences> =>
  (
    await api.request<{ preferences: LocationPreferences }>(
      '/locations/me/preferences',
      { method: 'PATCH', body: { sharingEnabled, ghostMode } },
    )
  ).preferences;

export const updateMyLocation = (latitude: number, longitude: number) =>
  api.request<{ lastUpdatedAt: string }>('/locations/me', {
    method: 'PUT',
    body: { latitude, longitude },
  });

export const getFriendLocations = async (): Promise<SharedFriendLocation[]> =>
  (await api.request<{ items: SharedFriendLocation[] }>('/locations/friends')).items;