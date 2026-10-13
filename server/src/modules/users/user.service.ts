import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';
import { friendService } from '../friends/friend.service';
import { snapService } from '../snaps/snap.service';
import { storyService } from '../stories/story.service';
import { userRepository } from './user.repository';
import type {
  PaginatedItems,
  PaginationInput,
  ProfileStats,
  ProfileUser,
  PublicProfileUser,
  UpdateProfileInput,
} from './user.types';

const toProfileUser = (user: ProfileUser) => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  avatar: user.avatar ?? null,
  gender: user.gender ?? null,
  bio: user.bio ?? '',
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});

const toPublicProfile = (user: PublicProfileUser) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar ?? null,
  gender: user.gender ?? null,
  bio: user.bio ?? '',
  createdAt: user.createdAt,
});

const getCurrentUser = async (userId: string): Promise<ProfileUser> => {
  const user = await userRepository.findProfileById(userId);
  if (!user) {
    throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
  }
  return user as ProfileUser;
};

export const userService = {
  async getMyProfile(userId: string) {
    return toProfileUser(await getCurrentUser(userId));
  },

  async getPublicProfile(username: string) {
    const user = await userRepository.findPublicProfileByUsername(username);
    if (!user) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    return toPublicProfile(user as PublicProfileUser);
  },

  async updateMyProfile(userId: string, changes: UpdateProfileInput) {
    const currentUser = await getCurrentUser(userId);
    const hasChanges = Object.entries(changes).some(
      ([field, value]) =>
        currentUser[field as keyof ProfileUser] !== value,
    );
    if (!hasChanges) {
      return toProfileUser(currentUser);
    }
    if (
      changes.username &&
      (await userRepository.findUsernameOwner(changes.username, userId))
    ) {
      throw new HttpError(
        409,
        'Username is already in use',
        'USERNAME_ALREADY_EXISTS',
      );
    }
    try {
      const user = await userRepository.updateProfile(userId, changes);
      if (!user) {
        throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
      }
      return toProfileUser(user as ProfileUser);
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 11000
      ) {
        throw new HttpError(
          409,
          'Username is already in use',
          'USERNAME_ALREADY_EXISTS',
        );
      }
      throw error;
    }
  },

  async getMyStats(userId: string): Promise<ProfileStats> {
    const [friends, stories, snaps] = await Promise.all([
      friendService.getFriendCount(userId),
      storyService.countActiveStories(userId),
      snapService.countActiveSent(userId),
    ]);
    return { friends, stories, snaps };
  },

  async getMySnaps(
    userId: string,
    pagination: PaginationInput,
  ): Promise<PaginatedItems<unknown>> {
    return snapService.getSent(userId, pagination.page, pagination.limit);
  },

  async getMyStories(
    userId: string,
    pagination: PaginationInput,
  ): Promise<PaginatedItems<unknown>> {
    return storyService.getMyStories(userId, pagination);
  },

  async updateAvatar(userId: string, file: Express.Multer.File) {
    const cloudinaryConfigured = Boolean(
      env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET,
    );
    if (!cloudinaryConfigured) {
      throw new HttpError(
        503,
        'Avatar upload is not configured',
        'AVATAR_UPLOAD_UNAVAILABLE',
      );
    }

    await getCurrentUser(userId);
    const { uploadAvatarImage } = await import('./userAvatarUpload');
    const avatar = await uploadAvatarImage(file);
    const updated = await userRepository.updateAvatar(userId, avatar);
    if (!updated) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    return toProfileUser(updated as ProfileUser);
  },
};