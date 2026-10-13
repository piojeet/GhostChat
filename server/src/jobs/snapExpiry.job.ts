import { snapRepository } from '../modules/snaps/snap.repository';
import { deleteCloudinaryAsset } from '../modules/media/cloudinaryStorage';
import type { SnapMediaType } from '../modules/snaps/snap.types';
import { snapService } from '../modules/snaps/snap.service';

const CLEANUP_BATCH_SIZE = 100;
const CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

export const runSnapExpiryCleanup = async (): Promise<number> => {
  if (!snapService.isCloudinaryConfigured()) {
    console.warn('Cloudinary is not configured; expired snap media cannot be removed');
    return 0;
  }

  const expired = await snapRepository.findExpired(new Date(), CLEANUP_BATCH_SIZE);
  if (expired.length === 0) return 0;

  const cleanedIds: string[] = [];
  for (const snap of expired) {
    try {
      await deleteCloudinaryAsset(snap.mediaPublicId, snap.mediaType as SnapMediaType);
      cleanedIds.push(snap._id.toString());
    } catch (error) {
      console.error(`Unable to delete expired snap media ${snap._id.toString()}`, error);
    }
  }

  if (cleanedIds.length === 0) return 0;
  const result = await snapRepository.deleteExpired(cleanedIds);
  return result.deletedCount;
};

export const startSnapExpiryJob = (): NodeJS.Timeout => {
  const interval = setInterval(() => {
    runSnapExpiryCleanup().catch(error => {
      console.error('Snap expiry cleanup failed', error);
    });
  }, CLEANUP_INTERVAL_MS);
  interval.unref();
  runSnapExpiryCleanup().catch(error => {
    console.error('Initial snap expiry cleanup failed', error);
  });
  return interval;
};
