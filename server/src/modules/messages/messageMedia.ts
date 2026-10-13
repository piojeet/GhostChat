import { HttpError } from '../../utils/httpError';
import {
  deleteCloudinaryAsset,
  uploadCloudinaryBuffer,
} from '../media/cloudinaryStorage';

export type MessageMediaType = 'image' | 'voice';

const MAX_MESSAGE_MEDIA_SIZE = 15 * 1024 * 1024;
const imageMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);
const audioMimeTypes = new Set([
  'audio/aac',
  'audio/3gpp',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
]);

const hasImageSignature = (file: Express.Multer.File): boolean => {
  const { buffer, mimetype } = file;
  if (mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (mimetype === 'image/png') {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (mimetype === 'image/gif') {
    return buffer.length >= 6 &&
      ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'));
  }
  return buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';
};

const hasAudioSignature = (file: Express.Multer.File): boolean => {
  const { buffer, mimetype } = file;
  if (mimetype === 'audio/wav' || mimetype === 'audio/x-wav') {
    return buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WAVE';
  }
  if (mimetype === 'audio/ogg') {
    return buffer.length >= 4 && buffer.subarray(0, 4).toString('ascii') === 'OggS';
  }
  if (mimetype === 'audio/webm') {
    return buffer.length >= 4 &&
      buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  }
  if (mimetype === 'audio/mpeg') {
    return buffer.length >= 3 &&
      (
        buffer.subarray(0, 3).toString('ascii') === 'ID3' ||
        (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)
      );
  }
  if (mimetype === 'audio/aac') {
    return buffer.length >= 2 && buffer[0] === 0xff && (buffer[1] & 0xf6) === 0xf0;
  }
  return buffer.length >= 12 &&
    buffer.subarray(4, 8).toString('ascii') === 'ftyp';
};

export const validateMessageMedia = (
  file: Express.Multer.File,
  mediaType: MessageMediaType,
): void => {
  const allowedMimeTypes = mediaType === 'image' ? imageMimeTypes : audioMimeTypes;
  const hasValidSignature = mediaType === 'image'
    ? hasImageSignature(file)
    : hasAudioSignature(file);
  if (
    file.size > MAX_MESSAGE_MEDIA_SIZE ||
    file.buffer.length === 0 ||
    file.buffer.length > MAX_MESSAGE_MEDIA_SIZE
  ) {
    throw new HttpError(413, 'Chat attachments must be 15 MB or smaller', 'INVALID_MESSAGE_MEDIA');
  }
  if (!allowedMimeTypes.has(file.mimetype) || !hasValidSignature) {
    throw new HttpError(400, 'File content does not match the selected chat attachment type', 'INVALID_MESSAGE_MEDIA');
  }
};

export const uploadMessageMedia = async (
  file: Express.Multer.File,
  mediaType: MessageMediaType,
): Promise<{ url: string; publicId: string; resourceType: 'image' | 'video' }> => {
  validateMessageMedia(file, mediaType);
  const resourceType = mediaType === 'image' ? 'image' : 'video';
  const uploaded = await uploadCloudinaryBuffer(file.buffer, {
    folder: 'snapapp/messages',
    resource_type: resourceType,
  });
  return { ...uploaded, resourceType };
};

export const deleteMessageMedia = async (
  publicId: string,
  resourceType: 'image' | 'video',
): Promise<void> => deleteCloudinaryAsset(publicId, resourceType);
