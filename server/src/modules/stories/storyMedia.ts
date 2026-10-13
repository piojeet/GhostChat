import { HttpError } from '../../utils/httpError';
import {
  deleteCloudinaryAsset,
  getCloudinaryClient,
  uploadCloudinaryBuffer,
} from '../media/cloudinaryStorage';
import type { StoryMediaType } from './story.types';

const hasSupportedContent = (
  file: Express.Multer.File,
  mediaType: StoryMediaType,
): boolean => {
  const { buffer, mimetype } = file;
  if (mediaType === 'image') {
    const png =
      buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const jpeg = buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    const gif = buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
    const webp =
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP';
    return (
      (mimetype === 'image/png' && png) ||
      (mimetype === 'image/jpeg' && jpeg) ||
      (mimetype === 'image/gif' && gif) ||
      (mimetype === 'image/webp' && webp)
    );
  }

  const isMp4 = buffer.length >= 12 && buffer.subarray(4, 8).toString('ascii') === 'ftyp';
  const isWebm =
    buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return (
    ((mimetype === 'video/mp4' || mimetype === 'video/quicktime') && isMp4) ||
    (mimetype === 'video/webm' && isWebm)
  );
};

export const uploadStoryMedia = async (
  file: Express.Multer.File,
  mediaType: StoryMediaType,
): Promise<{ url: string; publicId: string }> => {
  getCloudinaryClient();
  const maximumSize = mediaType === 'image' ? 15 * 1024 * 1024 : 50 * 1024 * 1024;
  if (file.size > maximumSize) {
    throw new HttpError(
      413,
      mediaType === 'image'
        ? 'Story images must be 15 MB or smaller'
        : 'Story videos must be 50 MB or smaller',
      'INVALID_STORY_MEDIA',
    );
  }
  if (!hasSupportedContent(file, mediaType)) {
    throw new HttpError(400, 'File content does not match the selected media type', 'INVALID_STORY_MEDIA');
  }

  try {
    return await uploadCloudinaryBuffer(file.buffer, {
      folder: 'snapapp/stories',
      resource_type: mediaType === 'video' ? 'video' : 'image',
    });
  } catch (error) {
    if (error instanceof HttpError && error.code === 'MEDIA_UPLOAD_FAILED') {
      throw new HttpError(502, 'Unable to upload story media', 'MEDIA_UPLOAD_FAILED');
    }
    throw error;
  }
};

export const deleteStoryMedia = async (
  publicId: string,
  mediaType: StoryMediaType,
): Promise<void> => {
  try {
    await deleteCloudinaryAsset(publicId, mediaType === 'video' ? 'video' : 'image');
  } catch (error) {
    if (error instanceof HttpError && error.code === 'MEDIA_DELETE_FAILED') {
      throw new HttpError(502, 'Unable to delete story media', 'MEDIA_DELETE_FAILED');
    }
    throw error;
  }
};
