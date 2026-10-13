import { env } from '../config/env';
import { storyRepository } from '../modules/stories/story.repository';
import { deleteStoryMedia } from '../modules/stories/storyMedia';
import type { StoryMediaType } from '../modules/stories/story.types';

const CLEANUP_BATCH_SIZE = 100;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export const runStoryExpiryCleanup = async (): Promise<number> => {
  const now = new Date();
  const expiredStories = await storyRepository.findExpired(now, CLEANUP_BATCH_SIZE);
  if (expiredStories.length === 0) return 0;

  const configured = Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET,
  );
  if (!configured) {
    console.warn('Cloudinary is not configured; expired story media cannot be removed');
    return 0;
  }

  const cleanedStoryIds: string[] = [];
  for (const story of expiredStories) {
    try {
      await deleteStoryMedia(
        story.mediaPublicId,
        story.mediaType as StoryMediaType,
      );
      cleanedStoryIds.push(story._id.toString());
    } catch (error) {
      console.error(`Unable to delete expired story media ${story._id.toString()}`, error);
    }
  }
  if (cleanedStoryIds.length === 0) return 0;

  const storyIds = cleanedStoryIds;
  await storyRepository.deleteViewsForStories(storyIds);
  const result = await storyRepository.deleteExpired(storyIds);
  return result.deletedCount;
};

export const startStoryExpiryJob = (): NodeJS.Timeout => {
  const interval = setInterval(() => {
    runStoryExpiryCleanup().catch(error => {
      console.error('Story expiry cleanup failed', error);
    });
  }, CLEANUP_INTERVAL_MS);
  interval.unref();
  runStoryExpiryCleanup().catch(error => {
    console.error('Initial story expiry cleanup failed', error);
  });
  return interval;
};