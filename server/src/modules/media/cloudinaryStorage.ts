import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiOptions } from 'cloudinary';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';

export type CloudinaryResourceType = 'image' | 'video';
const MEDIA_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

export const getCloudinaryClient = (): typeof cloudinary => {
  if (
    !env.CLOUDINARY_CLOUD_NAME ||
    !env.CLOUDINARY_API_KEY ||
    !env.CLOUDINARY_API_SECRET
  ) {
    throw new HttpError(503, 'Media upload is not configured', 'MEDIA_UNAVAILABLE');
  }
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  return cloudinary;
};

export const uploadCloudinaryBuffer = async (
  buffer: Buffer,
  options: UploadApiOptions,
): Promise<{ url: string; publicId: string }> =>
  new Promise((resolve, reject) => {
    const upload = getCloudinaryClient().uploader.upload_stream(
      { ...options, timeout: MEDIA_UPLOAD_TIMEOUT_MS },
      (error, result) => {
        if (error || !result?.secure_url || !result.public_id) {
          console.error(`Cloudinary upload failed for ${options.folder ?? 'media'}`, error);
          const timedOut =
            typeof error === 'object' &&
            error !== null &&
            (
              ('http_code' in error && error.http_code === 499) ||
              ('name' in error && error.name === 'TimeoutError')
            );
          reject(new HttpError(
            timedOut ? 504 : 502,
            timedOut
              ? 'Media upload timed out. Check your internet connection and try again.'
              : 'Unable to upload media. Please try again.',
            timedOut ? 'MEDIA_UPLOAD_TIMEOUT' : 'MEDIA_UPLOAD_FAILED',
          ));
          return;
        }
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    );
    upload.end(buffer);
  });

export const deleteCloudinaryAsset = async (
  publicId: string,
  resourceType: CloudinaryResourceType,
): Promise<void> => {
  const result = await getCloudinaryClient().uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true,
  });
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new HttpError(502, 'Unable to delete media', 'MEDIA_DELETE_FAILED');
  }
};
