export type MessageReceipt = {
  recipientId: string;
  deliveredAt: string | null;
  readAt: string | null;
};

export type ChatMessage = {
  id: string;
  senderId: string;
  type: 'text' | 'image' | 'voice' | 'call';
  text: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaSizeBytes: number | null;
  callId: string | null;
  callKind: 'audio' | 'video' | null;
  callStatus:
    | 'ringing'
    | 'accepted'
    | 'connected'
    | 'ended'
    | 'rejected'
    | 'cancelled'
    | 'missed'
    | 'busy'
    | 'unavailable'
    | 'timeout'
    | 'failed'
    | null;
  durationSeconds: number | null;
  replyToId: string | null;
  sentAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  receipts: MessageReceipt[];
};

export type MessageReceiptEvent = {
  chatId: string;
  messageId: string;
  recipientId: string;
  status: 'delivered' | 'read';
  at: string;
};

export type SendMessageResponse = {
  message: ChatMessage;
};