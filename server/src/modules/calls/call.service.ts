import { createHmac } from 'node:crypto';
import { Types } from 'mongoose';
import { env } from '../../config/env';
import { blockRepository } from '../blocks/block.repository';
import { Friend } from '../friends/friend.model';
import { pairKeyFor } from '../friends/friend.repository';
import { User } from '../users/user.model';
import { messageService } from '../messages/message.service';
import { HttpError } from '../../utils/httpError';
import { callRepository, type PopulatedCall } from './call.repository';
import {
  assertCallCanSignal,
  assertCallNotBlocked,
  assertCallParticipant,
} from './call.policy';
import { canTransitionCallState, isTerminalCallState } from './call.state';
import type {
  CallKind,
  CallResponse,
  CallState,
  IceServer,
} from './call.types';

const activeStates: CallState[] = ['ringing', 'accepted', 'connected'];
const RING_TIMEOUT_MS = 45_000;

const toParticipant = (user: PopulatedCall['caller']) => ({
  id: user._id.toString(),
  username: user.username,
  displayName: user.displayName,
  avatar: user.avatar ?? null,
});

export const toCallResponse = (call: PopulatedCall): CallResponse => ({
  id: call._id.toString(),
  caller: toParticipant(call.caller),
  recipient: toParticipant(call.recipient),
  kind: call.kind,
  state: call.state,
  createdAt: call.createdAt,
  ringingAt: call.ringingAt,
  acceptedAt: call.acceptedAt ?? null,
  connectedAt: call.connectedAt ?? null,
  endedAt: call.endedAt ?? null,
  durationSeconds: call.durationSeconds ?? null,
});

const persistCallActivity = async (call: CallResponse) => {
  try {
    return await messageService.upsertCallActivity({
      callId: call.id,
      callerId: call.caller.id,
      recipientId: call.recipient.id,
      kind: call.kind,
      status: call.state,
      durationSeconds: call.durationSeconds,
      sentAt: call.createdAt,
    });
  } catch {
    console.error('Unable to persist call activity in chat', { callId: call.id });
    return null;
  }
};

const assertFriendEligible = async (callerId: string, recipientId: string) => {
  if (callerId === recipientId) {
    throw new HttpError(400, 'You cannot call yourself', 'CANNOT_CALL_SELF');
  }
  if (await blockRepository.isBlockedBetween(callerId, recipientId)) {
    throw new HttpError(403, 'This user relationship is blocked', 'ALREADY_BLOCKED');
  }
  const [caller, recipient, friendship] = await Promise.all([
    User.exists({ _id: callerId, isActive: true, isEmailVerified: true }),
    User.findOne({
      _id: recipientId,
      isActive: true,
      isEmailVerified: true,
    }).select('_id username displayName avatar').lean(),
    Friend.exists({
      activePairKey: pairKeyFor(callerId, recipientId),
      status: 'accepted',
    }),
  ]);
  if (!caller) throw new HttpError(401, 'Authenticated user is unavailable', 'UNAUTHENTICATED');
  if (!recipient) throw new HttpError(404, 'User not found', 'USER_UNAVAILABLE');
  if (!friendship) {
    throw new HttpError(403, 'Calls are only available between accepted friends', 'NOT_FRIENDS');
  }
  return recipient;
};

const saveTerminalCall = async (
  callId: string,
  state: Extract<CallState, 'ended' | 'rejected' | 'cancelled' | 'missed' | 'timeout' | 'failed'>,
) => {
  const expectedStates: CallState[] =
    state === 'timeout' || state === 'missed' || state === 'rejected' || state === 'cancelled'
      ? ['ringing']
      : state === 'ended'
        ? ['accepted', 'connected']
        : activeStates;
  const call = await callRepository.transition(callId, expectedStates, {
    $set: {
      state,
      endedAt: new Date(),
      ...(state === 'ended' ? {} : { durationSeconds: 0 }),
    },
    $unset: { activeParticipantIds: 1 },
  });
  const finalCall = call ?? await callRepository.findById(callId);
  if (finalCall && isTerminalCallState(finalCall.state)) {
    await persistCallActivity(toCallResponse(finalCall));
  }
  return finalCall;
};

const cleanupExpiredRinging = async (participantIds: string[]) => {
  const expired = await callRepository.findStaleRinging(
    participantIds,
    new Date(Date.now() - RING_TIMEOUT_MS),
  );
  await Promise.all(
    expired.map(({ _id }) => saveTerminalCall(_id.toString(), 'timeout')),
  );
};

const isDuplicateKey = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'code' in error && error.code === 11000;

const turnUrls = env.TURN_URLS.split(',').map(url => url.trim()).filter(Boolean);

const makeIceServers = (userId: string): IceServer[] => {
  const servers: IceServer[] = env.STUN_URLS.split(',')
    .map(url => url.trim())
    .filter(Boolean)
    .map(urls => ({ urls }));
  if (turnUrls.length && env.TURN_SHARED_SECRET) {
    const expiry = Math.floor(Date.now() / 1000) + 60 * 60;
    const username = `${expiry}:${userId}`;
    const credential = createHmac('sha1', env.TURN_SHARED_SECRET)
      .update(username)
      .digest('base64');
    servers.push({ urls: turnUrls, username, credential });
  }
  return servers;
};

export const callService = {
  async start(callerId: string, recipientId: string, kind: CallKind, recipientOnline: boolean) {
    await assertFriendEligible(callerId, recipientId);
    await cleanupExpiredRinging([callerId, recipientId]);
    if (env.NODE_ENV === 'production' && (!turnUrls.length || !env.TURN_SHARED_SECRET)) {
      throw new HttpError(
        503,
        'Calling is unavailable until TURN relay configuration is installed',
        'CALL_RELAY_UNAVAILABLE',
      );
    }
    if (!recipientOnline) {
      const call = await callRepository.create({
        caller: new Types.ObjectId(callerId),
        recipient: new Types.ObjectId(recipientId),
        kind,
        state: 'unavailable',
        ringingAt: new Date(),
        endedAt: new Date(),
        durationSeconds: 0,
      });
      if (!call) throw new HttpError(500, 'Unable to record call', 'INTERNAL_ERROR');
      const response = toCallResponse(call);
      await persistCallActivity(response);
      return response;
    }
    try {
      const call = await callRepository.create({
        caller: new Types.ObjectId(callerId),
        recipient: new Types.ObjectId(recipientId),
        kind,
        state: 'ringing',
        activeParticipantIds: [
          new Types.ObjectId(callerId),
          new Types.ObjectId(recipientId),
        ],
        ringingAt: new Date(),
      });
      if (!call) throw new HttpError(500, 'Unable to start call', 'INTERNAL_ERROR');
      const response = toCallResponse(call);
      await persistCallActivity(response);
      return response;
    } catch (error) {
      if (isDuplicateKey(error)) {
        const busyCall = await callRepository.create({
          caller: new Types.ObjectId(callerId),
          recipient: new Types.ObjectId(recipientId),
          kind,
          state: 'busy',
          ringingAt: new Date(),
          endedAt: new Date(),
          durationSeconds: 0,
        });
        if (busyCall) await persistCallActivity(toCallResponse(busyCall));
        throw new HttpError(409, 'One of the users is already on a call', 'USER_BUSY');
      }
      throw error;
    }
  },

  async accept(callId: string, userId: string) {
    const current = await callRepository.findById(callId);
    if (!current) throw new HttpError(404, 'Call not found', 'CALL_NOT_FOUND');
    if (current.recipient._id.toString() !== userId) {
      throw new HttpError(403, 'Only the recipient can accept this call', 'NOT_AUTHORIZED');
    }
    if (current.state === 'accepted' || current.state === 'connected') {
      const response = toCallResponse(current);
      await persistCallActivity(response);
      return response;
    }
    if (!canTransitionCallState(current.state, 'accepted')) {
      throw new HttpError(409, 'Call is no longer ringing', 'INVALID_CALL_STATE');
    }
    await assertFriendEligible(current.caller._id.toString(), userId);
    if (Date.now() - current.ringingAt.getTime() >= RING_TIMEOUT_MS) {
      const expired = await saveTerminalCall(callId, 'timeout');
      if (expired) throw new HttpError(409, 'Call request expired', 'CALL_TIMEOUT');
    }
    const accepted = await callRepository.transition(callId, ['ringing'], {
      $set: { state: 'accepted', acceptedAt: new Date() },
    });
    if (accepted) {
      const response = toCallResponse(accepted);
      await persistCallActivity(response);
      return response;
    }
    const latest = await callRepository.findById(callId);
    if (latest?.state === 'accepted' || latest?.state === 'connected') {
      const response = toCallResponse(latest);
      await persistCallActivity(response);
      return response;
    }
    throw new HttpError(409, 'Call is no longer available', 'INVALID_CALL_STATE');
  },

  async markConnected(callId: string, userId: string) {
    const call = await this.assertSignalAccess(callId, userId);
    if (call.state === 'connected') return toCallResponse(call);
    const connected = await callRepository.transition(callId, ['accepted'], {
      $set: { state: 'connected', connectedAt: new Date() },
    });
    if (connected) {
      const response = toCallResponse(connected);
      await persistCallActivity(response);
      return response;
    }
    const latest = await callRepository.findById(callId);
    if (!latest || !activeStates.includes(latest.state)) {
      throw new HttpError(409, 'Call has already ended', 'INVALID_CALL_STATE');
    }
    return toCallResponse(latest);
  },

  async assertSignalAccess(callId: string, userId: string) {
    const call = await callRepository.findById(callId);
    if (!call) throw new HttpError(404, 'Call not found', 'CALL_NOT_FOUND');
    const callerId = call.caller._id.toString();
    const recipientId = call.recipient._id.toString();
    assertCallParticipant(callerId, recipientId, userId);
    assertCallCanSignal(call.state);
    try {
      assertCallNotBlocked(Boolean(
        await blockRepository.isBlockedBetween(callerId, recipientId),
      ));
    } catch (error) {
      if (error instanceof HttpError && error.code === 'ALREADY_BLOCKED') {
        await saveTerminalCall(callId, 'failed');
      }
      throw error;
    }
    return call;
  },

  async finish(
    callId: string,
    userId: string,
    outcome: 'ended' | 'rejected' | 'cancelled' | 'missed' | 'failed',
  ) {
    const call = await callRepository.findById(callId);
    if (!call) throw new HttpError(404, 'Call not found', 'CALL_NOT_FOUND');
    const callerId = call.caller._id.toString();
    const recipientId = call.recipient._id.toString();
    assertCallParticipant(callerId, recipientId, userId);
    if (isTerminalCallState(call.state)) {
      const response = toCallResponse(call);
      await persistCallActivity(response);
      return response;
    }
    if (outcome === 'cancelled' && userId !== callerId) {
      throw new HttpError(403, 'Only the caller can cancel this call', 'NOT_AUTHORIZED');
    }
    if (outcome === 'rejected' && (userId !== recipientId || call.state !== 'ringing')) {
      throw new HttpError(403, 'Only the recipient can reject a ringing call', 'NOT_AUTHORIZED');
    }
    if (outcome === 'missed' && (userId !== recipientId || call.state !== 'ringing')) {
      throw new HttpError(403, 'Only a ringing recipient disconnect can mark the call missed', 'NOT_AUTHORIZED');
    }
    const finalState = outcome === 'cancelled' && call.state !== 'ringing'
      ? 'ended'
      : outcome;
    if (!canTransitionCallState(call.state, finalState)) {
      throw new HttpError(409, 'Call is no longer active', 'INVALID_CALL_STATE');
    }
    const endedAt = new Date();
    const ended = await callRepository.transition(callId, [call.state], {
      $set: {
        state: finalState,
        endedAt,
        durationSeconds: call.connectedAt
          ? Math.max(0, Math.floor((endedAt.getTime() - call.connectedAt.getTime()) / 1000))
          : 0,
      },
      $unset: { activeParticipantIds: 1 },
    });
    if (ended) {
      const response = toCallResponse(ended);
      await persistCallActivity(response);
      return response;
    }
    const latest = await callRepository.findById(callId);
    if (latest && isTerminalCallState(latest.state)) {
      const response = toCallResponse(latest);
      await persistCallActivity(response);
      return response;
    }
    if (latest) {
      throw new HttpError(409, 'Call changed while processing this action', 'INVALID_CALL_STATE');
    }
    throw new HttpError(404, 'Call not found', 'CALL_NOT_FOUND');
  },

  async finishOnDisconnect(callId: string, userId: string) {
    const call = await callRepository.findById(callId);
    if (!call || isTerminalCallState(call.state)) return call ? toCallResponse(call) : null;
    if (call.state === 'ringing') {
      return this.finish(callId, userId, userId === call.caller._id.toString() ? 'cancelled' : 'missed');
    }
    return this.finish(callId, userId, call.state === 'connected' ? 'ended' : 'failed');
  },

  async getIceServers(userId: string) {
    const activeUser = await User.exists({
      _id: userId,
      isActive: true,
      isEmailVerified: true,
    });
    if (!activeUser) {
      throw new HttpError(401, 'Authenticated user is unavailable', 'UNAUTHENTICATED');
    }
    const servers = makeIceServers(userId);
    return {
      iceServers: servers,
      relayConfigured: turnUrls.length > 0 && Boolean(env.TURN_SHARED_SECRET),
    };
  },

  async history(userId: string, page: number, limit: number) {
    await cleanupExpiredRinging([userId]);
    const [calls, total] = await callRepository.findHistory(
      userId,
      (page - 1) * limit,
      limit,
    );
    return {
      items: calls.map(toCallResponse),
      pagination: {
        page,
        limit,
        total,
        hasNextPage: page * limit < total,
      },
    };
  },

  async expireRinging(callId: string) {
    return saveTerminalCall(callId, 'timeout');
  },

  async syncCallActivity(call: CallResponse) {
    return persistCallActivity(call);
  },

  async expireCallsOnServerStart() {
    const activeCalls = await callRepository.findAllActive();
    const finalizedCalls = await Promise.all(activeCalls.map(async call => {
      const endedAt = new Date();
      const state = call.state === 'ringing' ? 'timeout' : 'failed';
      const finalized = await callRepository.transition(call._id.toString(), [call.state], {
        $set: {
          state,
          endedAt,
          durationSeconds: call.connectedAt
            ? Math.max(0, Math.floor((endedAt.getTime() - call.connectedAt.getTime()) / 1000))
            : 0,
        },
        $unset: { activeParticipantIds: 1 },
      });
      if (finalized) await persistCallActivity(toCallResponse(finalized));
      return finalized;
    }));
    return finalizedCalls.filter(Boolean).length;
  },
};