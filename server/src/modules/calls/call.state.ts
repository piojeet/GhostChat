import type { CallState } from './call.types';

const allowedTransitions: Record<CallState, readonly CallState[]> = {
  ringing: ['accepted', 'rejected', 'cancelled', 'missed', 'busy', 'unavailable', 'timeout', 'failed'],
  accepted: ['connected', 'ended', 'failed'],
  connected: ['ended', 'failed'],
  ended: [],
  rejected: [],
  cancelled: [],
  missed: [],
  busy: [],
  unavailable: [],
  timeout: [],
  failed: [],
};

export const canTransitionCallState = (from: CallState, to: CallState): boolean =>
  allowedTransitions[from].includes(to);

export const isTerminalCallState = (state: CallState): boolean =>
  allowedTransitions[state].length === 0;
