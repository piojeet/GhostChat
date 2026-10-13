import type { Types } from 'mongoose';

export type CallKind = 'audio' | 'video';
export type CallState =
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
  | 'failed';

export type CallDocumentShape = {
  _id: Types.ObjectId;
  caller: Types.ObjectId;
  recipient: Types.ObjectId;
  kind: CallKind;
  state: CallState;
  activeParticipantIds?: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  ringingAt: Date;
  acceptedAt?: Date;
  connectedAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
};

export type CallParticipant = {
  id: string;
  username: string;
  displayName: string;
  avatar: string | null;
};

export type CallResponse = {
  id: string;
  caller: CallParticipant;
  recipient: CallParticipant;
  kind: CallKind;
  state: CallState;
  createdAt: Date;
  ringingAt: Date;
  acceptedAt: Date | null;
  connectedAt: Date | null;
  endedAt: Date | null;
  durationSeconds: number | null;
};

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};
