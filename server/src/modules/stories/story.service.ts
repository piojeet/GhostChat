import { HttpError } from '../../utils/httpError';
import { blockRepository } from '../blocks/block.repository';
import { friendService } from '../friends/friend.service';
import { storyRepository } from './story.repository';
import { deleteStoryMedia, uploadStoryMedia } from './storyMedia';
import type {
  CreateStoryInput,
  PaginatedStories,
  SafeStoryUser,
  StoryItem,
  StoryMediaType,
  StoryPagination,
} from './story.types';

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

type PopulatedStory = Omit<StoryItem, 'user'> & { user: SafeStoryUser };

const serializeUser = (user: SafeStoryUser) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar ?? null,
});

const serializeStory = (story: PopulatedStory) => ({
  id: story._id.toString(),
  user: serializeUser(story.user),
  media: story.media,
  mediaType: story.mediaType,
  caption: story.caption,
  visibility: story.visibility,
  createdAt: story.createdAt,
  expiresAt: story.expiresAt,
});

const paginationFor = (page: number, limit: number, total: number) => ({
  page,
  limit,
  total,
  hasNextPage: page * limit < total,
});

const getActiveStory = async (storyId: string): Promise<PopulatedStory> => {
  const story = await storyRepository.findActiveById(storyId, new Date());
  if (!story) {
    throw new HttpError(404, 'Story not found', 'STORY_NOT_FOUND');
  }
  return story as unknown as PopulatedStory;
};

const assertCanView = async (
  story: PopulatedStory,
  viewerId: string,
): Promise<void> => {
  const ownerId = story.user._id.toString();
  if (ownerId === viewerId) return;

  if (await blockRepository.isBlockedBetween(ownerId, viewerId)) {
    throw new HttpError(404, 'Story not found', 'STORY_NOT_FOUND');
  }
  if (story.visibility === 'public') return;

  const friendIds = await friendService.getFriendIds(ownerId);
  if (!friendIds.includes(viewerId)) {
    throw new HttpError(403, 'You do not have permission to view this story', 'STORY_FORBIDDEN');
  }
};

const serializePaginated = <T>(
  items: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedStories<T> => ({
  items,
  pagination: paginationFor(page, limit, total),
});

export const storyService = {
  async createStory(userId: string, file: Express.Multer.File, input: CreateStoryInput) {
    if (!(await storyRepository.findUser(userId))) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    const uploaded = await uploadStoryMedia(file, input.mediaType);
    const createdAt = new Date();
    let createdStoryId: string | undefined;
    try {
      const created = await storyRepository.create(
        userId,
        uploaded.url,
        uploaded.publicId,
        input.mediaType,
        input.caption ?? '',
        input.visibility,
        createdAt,
        new Date(createdAt.getTime() + STORY_LIFETIME_MS),
      );
      createdStoryId = created._id.toString();
    } catch (error) {
      try {
        await deleteStoryMedia(uploaded.publicId, input.mediaType);
      } catch (cleanupError) {
        console.error('Unable to clean up story media after database failure', cleanupError);
      }
      throw error;
    }
    const story = await storyRepository.findActiveById(createdStoryId, new Date());
    if (!story) {
      throw new HttpError(500, 'Unable to load created story', 'STORY_CREATE_FAILED');
    }
    return serializeStory(story as unknown as PopulatedStory);
  },

  async getMyStories(userId: string, pagination: StoryPagination) {
    const { page, limit } = pagination;
    const [stories, total] = await storyRepository.findActiveByUser(
      userId,
      new Date(),
      (page - 1) * limit,
      limit,
    );
    return serializePaginated(
      stories.map(story => serializeStory(story as unknown as PopulatedStory)),
      page,
      limit,
      total,
    );
  },

  async getFeed(userId: string, pagination: StoryPagination) {
    const friendIds = await friendService.getFriendIds(userId);
    const { page, limit } = pagination;
    const [stories, total] = await storyRepository.findActiveFeed(
      friendIds,
      new Date(),
      (page - 1) * limit,
      limit,
    );
    const storyIds = stories.map(story => story._id.toString());
    const viewedStories = await storyRepository.getViewedStoryIds(storyIds, userId);
    const viewedIds = new Set(viewedStories.map(view => view.story.toString()));
    return serializePaginated(
      stories.map(story => {
        const serialized = serializeStory(story as unknown as PopulatedStory);
        return { ...serialized, hasViewed: viewedIds.has(serialized.id) };
      }),
      page,
      limit,
      total,
    );
  },

  async getUserStories(viewerId: string, ownerId: string, pagination: StoryPagination) {
    const owner = await storyRepository.findUser(ownerId);
    if (!owner) {
      throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
    }
    const { page, limit } = pagination;
    let result: Awaited<ReturnType<typeof storyRepository.findActivePublicStoriesByUser>>;

    if (viewerId === ownerId) {
      result = await storyRepository.findActiveFriendStoriesByUser(
        ownerId,
        new Date(),
        (page - 1) * limit,
        limit,
      );
    } else {
      if (await blockRepository.isBlockedBetween(viewerId, ownerId)) {
        throw new HttpError(404, 'User not found', 'USER_NOT_FOUND');
      }
      const friendIds = await friendService.getFriendIds(ownerId);
      result = friendIds.includes(viewerId)
        ? await storyRepository.findActiveFriendStoriesByUser(
            ownerId,
            new Date(),
            (page - 1) * limit,
            limit,
          )
        : await storyRepository.findActivePublicStoriesByUser(
            ownerId,
            new Date(),
            (page - 1) * limit,
            limit,
          );
    }

    return serializePaginated(
      result[0].map(story => serializeStory(story as unknown as PopulatedStory)),
      page,
      limit,
      result[1],
    );
  },

  async getStory(viewerId: string, storyId: string) {
    const story = await getActiveStory(storyId);
    await assertCanView(story, viewerId);
    return serializeStory(story);
  },

  async viewStory(viewerId: string, storyId: string) {
    const story = await getActiveStory(storyId);
    await assertCanView(story, viewerId);
    if (story.user._id.toString() !== viewerId) {
      await storyRepository.upsertView(storyId, viewerId, new Date());
    }
    return { viewed: true };
  },

  async getViewers(viewerId: string, storyId: string, pagination: StoryPagination) {
    const story = await storyRepository.findOwned(storyId);
    if (!story) {
      throw new HttpError(404, 'Story not found', 'STORY_NOT_FOUND');
    }
    if (story.user.toString() !== viewerId) {
      throw new HttpError(403, 'Only the story owner can view viewers', 'NOT_AUTHORIZED');
    }
    if (story.expiresAt <= new Date()) {
      throw new HttpError(404, 'Story not found', 'STORY_NOT_FOUND');
    }

    const hiddenUserIds = await blockRepository.getBlockedUserIds(viewerId);
    const { page, limit } = pagination;
    const [viewers, total] = await storyRepository.findViewers(
      storyId,
      hiddenUserIds,
      (page - 1) * limit,
      limit,
    );
    const items = viewers
      .filter(view => view.viewer)
      .map(view => ({
        user: serializeUser(view.viewer as unknown as SafeStoryUser),
        viewedAt: view.viewedAt,
      }));
    return serializePaginated(items, page, limit, total);
  },

  async deleteStory(userId: string, storyId: string) {
    const existing = await storyRepository.findOwned(storyId);
    if (!existing) {
      throw new HttpError(404, 'Story not found', 'STORY_NOT_FOUND');
    }
    if (existing.user.toString() !== userId) {
      throw new HttpError(403, 'You cannot delete another user’s story', 'NOT_AUTHORIZED');
    }
    await deleteStoryMedia(existing.mediaPublicId, existing.mediaType as StoryMediaType);
    const deleted = await storyRepository.deleteStory(storyId, userId);
    if (!deleted) {
      throw new HttpError(409, 'Story was already removed', 'STORY_NOT_FOUND');
    }
    await storyRepository.deleteViewsForStory(storyId);
    return { success: true };
  },

  countActiveStories(userId: string): Promise<number> {
    return storyRepository.countActiveByUser(userId, new Date());
  },
};