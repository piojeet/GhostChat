import type { Types } from 'mongoose';

export type ChatPagination = {
  page: number;
  limit: number;
};

export type SafeChatUser = {
  _id: Types.ObjectId;
  username: string;
  displayName: string;
  avatar: string | null;
  gender?: 'male' | 'female' | null;
};

export type ConversationListRecord = {
  _id: Types.ObjectId;
  chatId: Types.ObjectId | null;
  otherUser: SafeChatUser;
  lastMessage: {
    messageId: Types.ObjectId;
    sender: Types.ObjectId;
    text: string;
    sentAt: Date;
  } | null;
  unreadCount: number;
  createdAt: Date;
  updatedAt: Date;
};