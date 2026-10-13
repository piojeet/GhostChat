import { api } from '../../../services/api/apiClient';
import type {
  OpenedSnap,
  SentSnap,
  SnapInboxItem,
  SnapPage,
  SnapDetails,
} from '../types/snap.types';
import type { SnapMedia } from '../../camera/types/media';

export const getSnapInbox = (page = 1, limit = 20) =>
  api.request<SnapPage<SnapInboxItem>>(`/snaps/inbox?page=${page}&limit=${limit}`);

export const getSentSnaps = (page = 1, limit = 20) =>
  api.request<SnapPage<SentSnap>>(`/snaps/sent?page=${page}&limit=${limit}`);

export const getSnap = async (snapId: string) =>
  (await api.request<{ snap: SnapDetails }>(`/snaps/${snapId}`)).snap;

export const sendSnap = async (
  media: SnapMedia,
  mediaType: 'image' | 'video',
  recipients: string[],
  caption = '',
  onRequestStart?: () => void,
) => {
  const form = new FormData();
  form.append('media', {
    uri: media.uri,
    name: media.fileName,
    type: media.mimeType,
  } as unknown as Blob);
  form.append('mediaType', mediaType);
  form.append('caption', caption);
  form.append('recipients', JSON.stringify(recipients));
  onRequestStart?.();
  return api.request<{ snap: SentSnap }>('/snaps', {
    method: 'POST',
    body: form,
  });
};

export const openSnap = async (snapId: string) =>
  (await api.request<{ snap: OpenedSnap }>(`/snaps/${snapId}/open`, {
    method: 'POST',
  })).snap;

export const replaySnap = async (snapId: string) =>
  (await api.request<{ snap: OpenedSnap }>(`/snaps/${snapId}/replay`, {
    method: 'POST',
  })).snap;