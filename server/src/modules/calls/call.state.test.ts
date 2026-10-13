import assert from 'node:assert/strict';
import test from 'node:test';
import {
  callIdPayloadSchema,
  iceCandidatePayloadSchema,
  signalPayloadSchema,
} from './call.validation';
import { canTransitionCallState, isTerminalCallState } from './call.state';
import {
  assertCallCanSignal,
  assertCallNotBlocked,
  assertCallParticipant,
  assertCallSignalSender,
} from './call.policy';

const validCallId = '0123456789abcdef01234567';

test('call state machine permits only valid forward transitions', () => {
  assert.equal(canTransitionCallState('ringing', 'accepted'), true);
  assert.equal(canTransitionCallState('accepted', 'connected'), true);
  assert.equal(canTransitionCallState('connected', 'ended'), true);
  assert.equal(canTransitionCallState('ringing', 'connected'), false);
  assert.equal(canTransitionCallState('rejected', 'accepted'), false);
  assert.equal(canTransitionCallState('accepted', 'accepted'), false);
  assert.equal(isTerminalCallState('timeout'), true);
  assert.equal(isTerminalCallState('connected'), false);
});

test('call authorization rejects non-participants, blocked pairs, and pre-accept signaling', () => {
  assert.doesNotThrow(() =>
    assertCallParticipant(validCallId, '1123456789abcdef01234567', validCallId),
  );
  assert.throws(
    () => assertCallParticipant(validCallId, '1123456789abcdef01234567', '2123456789abcdef01234567'),
    { code: 'NOT_AUTHORIZED' },
  );
  assert.throws(() => assertCallNotBlocked(true), { code: 'ALREADY_BLOCKED' });
  assert.doesNotThrow(() => assertCallNotBlocked(false));
  assert.throws(() => assertCallCanSignal('ringing'), { code: 'INVALID_CALL_STATE' });
  assert.doesNotThrow(() => assertCallCanSignal('accepted'));
  assert.doesNotThrow(() =>
    assertCallSignalSender(validCallId, '1123456789abcdef01234567', validCallId, 'offer'),
  );
  assert.throws(
    () => assertCallSignalSender(validCallId, '1123456789abcdef01234567', validCallId, 'answer'),
    { code: 'NOT_AUTHORIZED' },
  );
});

test('call signaling validators reject malformed IDs and oversized SDP', () => {
  assert.equal(callIdPayloadSchema.safeParse({ callId: validCallId }).success, true);
  assert.equal(callIdPayloadSchema.safeParse({ callId: 'not-an-id' }).success, false);
  assert.equal(
    signalPayloadSchema.safeParse({ callId: validCallId, sdp: 'v=0' }).success,
    true,
  );
  assert.equal(
    signalPayloadSchema.safeParse({
      callId: validCallId,
      sdp: 'x'.repeat(256_001),
    }).success,
    false,
  );
});

test('ICE candidate validator accepts WebRTC fields and rejects unknown payload data', () => {
  assert.equal(
    iceCandidatePayloadSchema.safeParse({
      callId: validCallId,
      candidate: {
        candidate: 'candidate:1 1 UDP 2122252543 192.0.2.1 54400 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0,
      },
    }).success,
    true,
  );
  assert.equal(
    iceCandidatePayloadSchema.safeParse({
      callId: validCallId,
      recipientId: validCallId,
      candidate: { candidate: 'candidate:1' },
    }).success,
    false,
  );
});
