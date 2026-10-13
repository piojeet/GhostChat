export type SendMessageInput = {
  text: string;
  replyToId?: string;
};

export type SendMessageMediaInput = {
  mediaType: 'image' | 'voice';
  durationSeconds?: number;
};

export type MessagePagination = {
  page: number;
  limit: number;
};