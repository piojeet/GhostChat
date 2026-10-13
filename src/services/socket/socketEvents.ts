import type {
  ChatMessageNewEvent,
  ChatPresenceEvent,
  ChatSocketConfirmation,
  ChatSocketError,
  ChatTypingEvent,
} from '../../features/chat/types/chat.types';
import type { MessageReceiptEvent } from '../../features/chat/types/message.types';
import type {
  CallCandidatePayload,
  CallErrorPayload,
  CallResponse,
  CallSignalPayload,
  CallOutgoingPayload,
} from '../../features/calls/types/call.types';

export type ChatJoinPayload = { chatId: string };
export type ChatSendPayload = ChatJoinPayload & {
  text: string;
  replyToId?: string;
};

export interface ClientToServerEvents {
  'chat:join': (payload: ChatJoinPayload) => void;
  'chat:leave': (payload: ChatJoinPayload) => void;
  'message:send': (payload: ChatSendPayload) => void;
  'message:read': (payload: ChatJoinPayload) => void;
  'typing:start': (payload: ChatJoinPayload) => void;
  'typing:stop': (payload: ChatJoinPayload) => void;
  'call:outgoing': (payload: CallOutgoingPayload) => void;
  'call:accept': (payload: { callId: string }) => void;
  'call:reject': (payload: { callId: string }) => void;
  'call:cancel': (payload: { callId: string }) => void;
  'call:offer': (payload: CallSignalPayload) => void;
  'call:answer': (payload: CallSignalPayload) => void;
  'call:ice_candidate': (payload: CallCandidatePayload) => void;
  'call:connected': (payload: { callId: string }) => void;
  'call:end': (payload: { callId: string }) => void;
  'call:failed': (payload: CallErrorPayload) => void;
}

export interface ServerToClientEvents {
  'message:new': (payload: ChatMessageNewEvent) => void;
  'notification:new': (payload: { category: 'snaps' | 'stories' | 'chats' | 'system'; entityId?: string }) => void;
  'message:error': (payload: ChatSocketError) => void;
  'message:read_receipt': (payload: MessageReceiptEvent) => void;
  'typing:start': (payload: ChatTypingEvent) => void;
  'typing:stop': (payload: ChatTypingEvent) => void;
  'user:online': (payload: ChatPresenceEvent) => void;
  'user:offline': (payload: ChatPresenceEvent) => void;
  'chat:joined': (payload: ChatSocketConfirmation) => void;
  'chat:left': (payload: ChatSocketConfirmation) => void;
  'call:outgoing': (payload: CallResponse) => void;
  'call:incoming': (payload: CallResponse) => void;
  'call:accepted': (payload: CallResponse) => void;
  'call:rejected': (payload: CallResponse) => void;
  'call:cancelled': (payload: CallResponse) => void;
  'call:offer': (payload: CallSignalPayload) => void;
  'call:answer': (payload: CallSignalPayload) => void;
  'call:ice_candidate': (payload: CallCandidatePayload) => void;
  'call:connected': (payload: CallResponse) => void;
  'call:ended': (payload: CallResponse) => void;
  'call:busy': (payload: CallErrorPayload) => void;
  'call:unavailable': (payload: CallResponse | CallErrorPayload) => void;
  'call:failed': (payload: CallErrorPayload | CallResponse) => void;
  'call:timeout': (payload: CallResponse) => void;
}