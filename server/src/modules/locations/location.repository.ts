import { Types } from 'mongoose';
import { Location } from './location.model';
import { User } from '../users/user.model';

const safeLocationUserFields = '_id username displayName avatar gender';

type PopulatedLocationUser = {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  avatar?: string | null;
  gender?: 'male' | 'female' | null;
  locationSharingSessionId?: string | null;
};

export const locationRepository = {
  findPreferences: (userId: string) =>
    User.findById(userId)
      .select('locationSharingEnabled ghostMode +locationSharingSessionId')
      .lean(),

  updatePreferences: (
    userId: string,
    sharingEnabled: boolean,
    ghostMode: boolean,
    sessionId: string | null,
  ) =>
    User.findByIdAndUpdate(
      userId,
      {
        $set: {
          locationSharingEnabled: sharingEnabled,
          ghostMode,
          locationSharingSessionId: sessionId,
        },
      },
      { new: true, runValidators: true },
    )
      .select('locationSharingEnabled ghostMode +locationSharingSessionId')
      .lean(),

  deleteLocation: (userId: string) => Location.deleteOne({ user: userId }),

  updateLocation: (
    userId: string,
    sessionId: string,
    latitude: number,
    longitude: number,
    expiresAt: Date,
  ) =>
    Location.findOneAndUpdate(
      { user: userId, sharingSessionId: sessionId },
      { $set: { latitude, longitude, expiresAt, sharingSessionId: sessionId } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    ).select('updatedAt'),

  findLocationTimestamp: (userId: string, sessionId?: string | null) =>
    Location.findOne({
      user: userId,
      ...(sessionId ? { sharingSessionId: sessionId } : {}),
      expiresAt: { $gt: new Date() },
    })
      .select('updatedAt')
      .lean(),

  findFriendLocations: (friendIds: string[], now: Date) =>
    Location.find({
      user: { $in: friendIds },
      expiresAt: { $gt: now },
    })
      .populate<{ user: PopulatedLocationUser | null }>({
        path: 'user',
        match: {
          isActive: true,
          isEmailVerified: true,
          locationSharingEnabled: true,
          ghostMode: false,
        },
        select: `${safeLocationUserFields} +locationSharingSessionId`,
      })
      .select('user latitude longitude updatedAt +sharingSessionId')
      .lean(),
};
