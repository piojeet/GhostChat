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
  createdAt: string;
  ringingAt: string;
  acceptedAt: string | null;
  connectedAt: string | null;
  endedAt: string | null;
  durationSeconds: number | null;
};

export type CallSignalPayload = { callId: string; sdp: string };
export type CallCandidatePayload = {
  callId: string;
  candidate: {
    candidate: string;
    sdpMid?: string | null;
    sdpMLineIndex?: number | null;
    usernameFragment?: string | null;
  };
};
export type CallOutgoingPayload = { recipientId: string; kind: CallKind };
export type CallErrorPayload = { callId?: string; code: string; message: string };

export type IceServer = {
  urls: string | string[];
  username?: string;
  credential?: string;
};

export type IceServerResponse = {
  iceServers: IceServer[];
  relayConfigured: boolean;
};