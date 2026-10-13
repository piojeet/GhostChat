import { randomUUID } from 'node:crypto';
import { HttpError } from '../../utils/httpError';
import { friendService } from '../friends/friend.service';
import { locationRepository } from './location.repository';

const LOCATION_RETENTION_MS = 12 * 60 * 60 * 1000;
const COORDINATE_PRECISION = 3;

const roundForFriendDisplay = (coordinate: number): number =>
  Number(coordinate.toFixed(COORDINATE_PRECISION));

const isObjectId = (value: string): boolean => /^[a-f\d]{24}$/i.test(value);

export const locationService = {
  async getPreferences(userId: string) {
    const user = await locationRepository.findPreferences(userId);
    if (!user) throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    const location =
      user.locationSharingEnabled &&
      !user.ghostMode &&
      user.locationSharingSessionId
        ? await locationRepository.findLocationTimestamp(
            userId,
            user.locationSharingSessionId,
          )
        : null;
    return {
      sharingEnabled: user.locationSharingEnabled ?? false,
      ghostMode: user.ghostMode ?? true,
      lastUpdatedAt: location?.updatedAt ?? null,
    };
  },

  async updatePreferences(userId: string, sharingEnabled: boolean, ghostMode: boolean) {
    const effectiveSharing = sharingEnabled && !ghostMode;
    const sessionId = effectiveSharing ? randomUUID() : null;
    const user = await locationRepository.updatePreferences(
      userId,
      effectiveSharing,
      ghostMode,
      sessionId,
    );
    if (!user) throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    if (!sharingEnabled || ghostMode) {
      await locationRepository.deleteLocation(userId);
    }
    return {
      sharingEnabled: user.locationSharingEnabled ?? false,
      ghostMode: user.ghostMode ?? true,
      lastUpdatedAt:
        effectiveSharing
          ? (
              await locationRepository.findLocationTimestamp(userId, sessionId)
            )?.updatedAt ?? null
          : null,
    };
  },

  async updateLocation(userId: string, latitude: number, longitude: number) {
    const preferences = await locationRepository.findPreferences(userId);
    if (!preferences) throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    if (!preferences.locationSharingEnabled || preferences.ghostMode) {
      throw new HttpError(
        403,
        'Enable location sharing and turn off Ghost Mode before sharing your location',
        'LOCATION_SHARING_DISABLED',
      );
    }
    if (!preferences.locationSharingSessionId) {
      throw new HttpError(
        403,
        'Location sharing must be enabled again before sharing your location',
        'LOCATION_SHARING_DISABLED',
      );
    }
    const location = await locationRepository.updateLocation(
      userId,
      preferences.locationSharingSessionId,
      latitude,
      longitude,
      new Date(Date.now() + LOCATION_RETENTION_MS),
    );
    const latestPreferences = await locationRepository.findPreferences(userId);
    if (
      !latestPreferences?.locationSharingEnabled ||
      latestPreferences.ghostMode ||
      latestPreferences.locationSharingSessionId !== preferences.locationSharingSessionId
    ) {
      throw new HttpError(
        403,
        'Location sharing changed before the update completed',
        'LOCATION_SHARING_DISABLED',
      );
    }
    return { lastUpdatedAt: location.updatedAt };
  },

  async getFriendLocations(userId: string) {
    const friendIds = await friendService.getFriendIds(userId);
    if (friendIds.length === 0) return { items: [] };
    const now = new Date();
    const locations = await locationRepository.findFriendLocations(friendIds, now);
    const visibleLocations = locations.flatMap(location => {
      const user = location.user;
      if (
        !user ||
        !isObjectId(user._id.toString()) ||
        !user.locationSharingSessionId ||
        user.locationSharingSessionId !== location.sharingSessionId
      ) return [];
      return [{ location, user }];
    });

    return {
      items: visibleLocations
        .map(({ location, user }) => ({
          user: {
            id: user._id.toString(),
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar ?? null,
            gender: user.gender ?? null,
          },
          latitude: roundForFriendDisplay(location.latitude),
          longitude: roundForFriendDisplay(location.longitude),
          lastUpdatedAt: location.updatedAt,
          isStale: now.getTime() - location.updatedAt.getTime() > 60 * 60 * 1000,
        })),
    };
  },
};
