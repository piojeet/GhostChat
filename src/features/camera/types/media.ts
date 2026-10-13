import type { Asset } from 'react-native-image-picker';

export type SnapMedia = {
  uri: string;
  type: 'photo' | 'video';
  fileName: string;
  mimeType: string;
  width: number | null;
  height: number | null;
  duration: number | null;
};

const fileNameFromUri = (uri: string): string =>
  uri.split(/[?#]/, 1)[0].split('/').pop() ?? '';

export const createCapturedMedia = (
  path: string,
  type: SnapMedia['type'],
  width: number,
  height: number,
  duration: number | null = null,
): SnapMedia => {
  const fileName = fileNameFromUri(path);
  const extension = type === 'video' ? 'mp4' : 'jpg';
  return {
    uri: path.startsWith('file://') ? path : `file://${path}`,
    type,
    fileName: fileName || `snap-${Date.now()}.${extension}`,
    mimeType: type === 'video' ? 'video/mp4' : 'image/jpeg',
    width,
    height,
    duration,
  };
};

export const createPickedMedia = (asset: Asset): SnapMedia | null => {
  if (!asset.uri) return null;
  const fileName =
    asset.fileName || fileNameFromUri(asset.originalPath ?? asset.uri);
  const extension = fileName.split('.').pop()?.toLowerCase();
  const type =
    asset.type?.startsWith('video/') ||
    ['mp4', 'mov', 'webm', 'm4v'].includes(extension ?? '')
      ? 'video'
      : 'photo';
  const mimeType =
    asset.type ??
    (type === 'video'
      ? extension === 'mov'
        ? 'video/quicktime'
        : 'video/mp4'
      : extension === 'png'
        ? 'image/png'
        : extension === 'webp'
          ? 'image/webp'
          : 'image/jpeg');

  return {
    uri: asset.uri,
    type,
    fileName: fileName || `snap-${Date.now()}.${type === 'video' ? 'mp4' : 'jpg'}`,
    mimeType,
    width: asset.width ?? null,
    height: asset.height ?? null,
    duration: asset.duration ?? null,
  };
};

export const mediaFromLegacyParams = (params: {
  media?: SnapMedia;
  imageUri?: string;
  mediaType?: 'photo' | 'video';
} | undefined): SnapMedia | undefined => {
  if (params?.media) return params.media;
  if (!params?.imageUri) return undefined;
  const type = params.mediaType === 'video' ? 'video' : 'photo';
  const fileName = fileNameFromUri(params.imageUri);
  return {
    uri: params.imageUri,
    type,
    fileName: fileName || `snap.${type === 'video' ? 'mp4' : 'jpg'}`,
    mimeType: type === 'video' ? 'video/mp4' : 'image/jpeg',
    width: null,
    height: null,
    duration: null,
  };
};
