import type { SendMessageInput } from '../modules/messages/message.types';
import type { CallResponse, CallKind } from '../modules/calls/call.types';
import type { NotificationCategory } from '../modules/notifications/notification.types';

export type ChatIdPayload = { chatId: string };
export type MessageSendPayload = ChatIdPayload & SendMessageInput;
export type MessageResponse = {
  id: string;
  senderId: string;
  type: 'text' | 'image' | 'voice' | 'call';
  text: string | null;
  mediaUrl: string | null;
  mediaMimeType: string | null;
  mediaSizeBytes: number | null;
  callId: string | null;
  callKind: CallKind | null;
  callStatus: CallResponse['state'] | null;
  durationSeconds: number | null;
  replyToId: string | null;
  sentAt: Date;
  editedAt: Date | null;
  deletedAt: Date | null;
  receipts: {
    recipientId: string;
    deliveredAt: Date | null;
    readAt: Date | null;
  }[];
};

export type SocketErrorPayload = {
  code: string;
  message: string;
  chatId?: string;
};

export type ReadReceiptPayload = {
  chatId: string;
  messageId: string;
  recipientId: string;
  status: 'delivered' | 'read';
  at: Date;
};

export type CallIdPayload = { callId: string };
export type CallOutgoingPayload = { recipientId: string; kind: CallKind };
export type CallSignalPayload = CallIdPayload & { sdp: string };
export type CallIcePayload = CallIdPayload & {
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
};
export type CallErrorPayload = {
  callId?: string;
  code: string;
  message: string;
};
export type NotificationCreatedPayload = {
  category: NotificationCategory;
  entityId?: string;
};

export interface ClientToServerEvents {
  /** Join only after the server confirms participant, friendship, and block eligibility. */
  'chat:join': (payload: ChatIdPayload) => void;
  /** Leave a previously authorized conversation room. */
  'chat:leave': (payload: ChatIdPayload) => void;
  /** Persist first; sender identity always comes from the authenticated socket. */
  'message:send': (payload: MessageSendPayload) => void;
  /** Explicitly mark received messages as read in MongoDB. */
  'message:read': (payload: ChatIdPayload) => void;
  /** Typing activity is sent only to the other participant after reauthorization. */
  'typing:start': (payload: ChatIdPayload) => void;
  'typing:stop': (payload: ChatIdPayload) => void;
  'call:outgoing': (payload: CallOutgoingPayload) => void;
  'call:accept': (payload: CallIdPayload) => void;
  'call:reject': (payload: CallIdPayload) => void;
  'call:cancel': (payload: CallIdPayload) => void;
  'call:offer': (payload: CallSignalPayload) => void;
  'call:answer': (payload: CallSignalPayload) => void;
  'call:ice_candidate': (payload: CallIcePayload) => void;
  'call:connected': (payload: CallIdPayload) => void;
  'call:end': (payload: CallIdPayload) => void;
  'call:failed': (payload: CallErrorPayload) => void;
}

export interface ServerToClientEvents {
  /** A persisted message published to the authenticated sender and recipient rooms. */
  'message:new': (payload: { chatId: string; message: MessageResponse }) => void;
  /** Safe event-level validation or authorization error; contains no message body. */
  'message:error': (payload: SocketErrorPayload) => void;
  /** Delivered means dispatched to an active recipient socket, not acknowledged by its app. */
  'message:read_receipt': (payload: ReadReceiptPayload) => void;
  /** Signals a persisted notification to the recipient's authenticated user room. */
  'notification:new': (payload: NotificationCreatedPayload) => void;
  /** Confirms the socket has joined or left after server authorization. */
  'chat:joined': (payload: ChatIdPayload) => void;
  'chat:left': (payload: ChatIdPayload) => void;
  /** Sent only to the other participant's private user room. */
  'typing:start': (payload: { chatId: string; userId: string }) => void;
  'typing:stop': (payload: { chatId: string; userId: string }) => void;
  /** Friend-visible process-local presence; resets on restart. */
  'user:online': (payload: { userId: string }) => void;
  'user:offline': (payload: { userId: string }) => void;
  'call:outgoing': (payload: CallResponse) => void;
  'call:incoming': (payload: CallResponse) => void;
  'call:accepted': (payload: CallResponse) => void;
  'call:rejected': (payload: CallResponse) => void;
  'call:cancelled': (payload: CallResponse) => void;
  'call:offer': (payload: CallSignalPayload) => void;
  'call:answer': (payload: CallSignalPayload) => void;
  'call:ice_candidate': (payload: CallIcePayload) => void;
  'call:connected': (payload: CallResponse) => void;
  'call:ended': (payload: CallResponse) => void;
  'call:busy': (payload: CallErrorPayload) => void;
  'call:unavailable': (payload: CallResponse | CallErrorPayload) => void;
  'call:failed': (payload: CallErrorPayload | CallResponse) => void;
  'call:timeout': (payload: CallResponse) => void;
}

export interface InterServerEvents {}

export interface SocketData {
  userId: string;
}

export const userRoom = (userId: string): string => `user:${userId}`;
export const chatRoom = (chatId: string): string => `chat:${chatId}`;