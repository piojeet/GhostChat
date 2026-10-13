import { User } from './user.model';
import type { UpdateProfileInput } from './user.types';

const safeProfileFields =
  '_id username email displayName avatar gender bio createdAt updatedAt';
const safePublicFields = '_id username displayName avatar gender bio createdAt';

export const userRepository = {
  findProfileById: (userId: string) =>
    User.findById(userId).select(safeProfileFields).lean(),

  findPublicProfileByUsername: (username: string) =>
    User.findOne({ username, isActive: true, isEmailVerified: true })
      .select(safePublicFields)
      .lean(),

  findUsernameOwner: (username: string, exceptUserId: string) =>
    User.exists({ username, _id: { $ne: exceptUserId } }),

  updateProfile: (userId: string, changes: UpdateProfileInput) =>
    User.findByIdAndUpdate(
      userId,
      { $set: changes },
      { new: true, runValidators: true, context: 'query' },
    )
      .select(safeProfileFields)
      .lean(),

  updateAvatar: (userId: string, avatar: string) =>
    User.findByIdAndUpdate(
      userId,
      { $set: { avatar } },
      { new: true, runValidators: true },
    )
      .select(safeProfileFields)
      .lean(),

  registerPushDevice: async (
    userId: string,
    token: string,
    platform: 'android' | 'ios',
  ): Promise<void> => {
    await User.updateMany(
      { _id: { $ne: userId }, 'pushDevices.token': token },
      { $pull: { pushDevices: { token } } },
    );
    const updated = await User.updateOne(
      { _id: userId, 'pushDevices.token': token },
      {
        $set: {
          'pushDevices.$.platform': platform,
          'pushDevices.$.updatedAt': new Date(),
        },
      },
    );
    if (updated.matchedCount === 0) {
      await User.updateOne(
        { _id: userId },
        { $push: { pushDevices: { token, platform, updatedAt: new Date() } } },
      );
    }
  },

  removePushDevice: (userId: string, token: string) =>
    User.updateOne({ _id: userId }, { $pull: { pushDevices: { token } } }),

  listPushDevices: async (userId: string) => {
    const user = await User.findById(userId)
      .select('+pushDevices.token')
      .lean();
    return user?.pushDevices ?? [];
  },
};