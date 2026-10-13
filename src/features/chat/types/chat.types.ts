import type { ChatMessage } from './message.types';

export type ChatParticipant = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
  gender?: 'male' | 'female' | null;
};

export type ChatConversation = {
  id: string;
  chatId: string | null;
  participant: ChatParticipant;
  lastMessage: {
    id: string;
    senderId: string;
    text: string;
    sentAt: string;
  } | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatPagination = {
  page: number;
  limit: number;
  total: number;
  hasNextPage: boolean;
};

export type ChatListResponse = {
  items: ChatConversation[];
  pagination: ChatPagination;
};

export type ChatSocketError = {
  code: string;
  message: string;
  chatId?: string;
};

export type ChatMessageNewEvent = {
  chatId: string;
  message: ChatMessage;
};

export type ChatTypingEvent = {
  chatId: string;
  userId: string;
};

export type ChatPresenceEvent = {
  userId: string;
};

export type ChatSocketConfirmation = {
  chatId: string;
};

export type MessagePageResponse = {
  items: ChatMessage[];
  pagination: ChatPagination;
};
