import { HttpError } from '../../utils/httpError';
import { getCloudinaryClient, uploadCloudinaryBuffer } from '../media/cloudinaryStorage';

const isSupportedImage = (buffer: Buffer): boolean => {
  const isPng =
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const isJpeg =
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff;
  const isGif =
    buffer.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
  return isPng || isJpeg || isGif || isWebp;
};

export const uploadAvatarImage = async (
  file: Express.Multer.File,
): Promise<string> => {
  if (!isSupportedImage(file.buffer)) {
    throw new HttpError(400, 'Uploaded file is not a supported image', 'INVALID_AVATAR');
  }

  getCloudinaryClient();
  try {
    const uploaded = await uploadCloudinaryBuffer(file.buffer, {
      folder: 'snapapp/avatars',
      resource_type: 'image',
      transformation: [{ width: 512, height: 512, crop: 'limit' }],
    });
    return uploaded.url;
  } catch (error) {
    if (error instanceof HttpError && error.code === 'MEDIA_UPLOAD_FAILED') {
      throw new HttpError(502, 'Unable to upload avatar image', 'AVATAR_UPLOAD_FAILED');
    }
    throw error;
  }
};
