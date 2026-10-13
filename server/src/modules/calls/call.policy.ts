import { HttpError } from '../../utils/httpError';
import type { CallState } from './call.types';

export const assertCallParticipant = (
  callerId: string,
  recipientId: string,
  userId: string,
): void => {
  if (userId !== callerId && userId !== recipientId) {
    throw new HttpError(403, 'Not a participant in this call', 'NOT_AUTHORIZED');
  }
};

export const assertCallNotBlocked = (blocked: boolean): void => {
  if (blocked) {
    throw new HttpError(403, 'This user relationship is blocked', 'ALREADY_BLOCKED');
  }
};

export const assertCallCanSignal = (state: CallState): void => {
  if (state !== 'accepted' && state !== 'connected') {
    throw new HttpError(409, 'Call is not active for signaling', 'INVALID_CALL_STATE');
  }
};

export const assertCallSignalSender = (
  callerId: string,
  recipientId: string,
  senderId: string,
  signal: 'offer' | 'answer',
): void => {
  const requiredSender = signal === 'offer' ? callerId : recipientId;
  if (senderId !== requiredSender) {
    throw new HttpError(
      403,
      signal === 'offer' ? 'Only the caller can send an offer' : 'Only the recipient can send an answer',
      'NOT_AUTHORIZED',
    );
  }
};
