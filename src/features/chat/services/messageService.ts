import { apiRequest } from '../../../services/api/apiClient';
import type {
  MessagePageResponse,
} from '../types/chat.types';
import type {
  SendMessageResponse,
} from '../types/message.types';

export type MessageMediaUpload = {
  uri: string;
  fileName: string;
  mimeType: string;
  mediaType: 'image' | 'voice';
  durationSeconds?: number;
};

export const getMessages = (
  chatId: string,
  page = 1,
  limit = 50,
): Promise<MessagePageResponse> =>
  apiRequest(`/chats/${chatId}/messages?page=${page}&limit=${limit}`);

export const sendMessage = (
  chatId: string,
  text: string,
): Promise<SendMessageResponse> =>
  apiRequest(`/chats/${chatId}/messages`, {
    method: 'POST',
    body: { text },
  });

export const sendMediaMessage = (
  chatId: string,
  media: MessageMediaUpload,
): Promise<SendMessageResponse> => {
  const form = new FormData();
  form.append('media', {
    uri: media.uri,
    name: media.fileName,
    type: media.mimeType,
  } as unknown as Blob);
  form.append('mediaType', media.mediaType);
  if (media.durationSeconds !== undefined) {
    form.append('durationSeconds', String(media.durationSeconds));
  }
  return apiRequest(`/chats/${chatId}/messages/media`, {
    method: 'POST',
    body: form,
    timeoutMs: 120_000,
  });
};

export const deleteMessage = (
  chatId: string,
  messageId: string,
): Promise<{ success: true }> =>
  apiRequest(`/chats/${chatId}/messages/${messageId}`, { method: 'DELETE' });
