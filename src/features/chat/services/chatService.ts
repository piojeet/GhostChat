import { apiRequest } from '../../../services/api/apiClient';
import type {
  ChatConversation,
  ChatListResponse,
} from '../types/chat.types';

export const getChats = (page = 1, limit = 20): Promise<ChatListResponse> =>
  apiRequest(`/chats?page=${page}&limit=${limit}`);

export const createOrGetChat = async (userId: string): Promise<ChatConversation> => {
  const result = await apiRequest<{ chat: Pick<ChatConversation, 'id' | 'participant' | 'createdAt' | 'updatedAt'> }>(
    '/chats',
    { method: 'POST', body: { userId } },
  );
  return {
    ...result.chat,
    chatId: result.chat.id,
    lastMessage: null,
    unreadCount: 0,
  };
};

export const markChatAsRead = (
  chatId: string,
): Promise<{ updatedCount: number }> =>
  apiRequest(`/chats/${chatId}/read`, { method: 'PATCH' });
