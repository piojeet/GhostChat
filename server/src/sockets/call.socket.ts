import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { HttpError } from '../utils/httpError';
import { callRepository } from '../modules/calls/call.repository';
import { callService, toCallResponse } from '../modules/calls/call.service';
import { publishCallActivity } from '../modules/calls/call.realtime';
import { pushService } from '../modules/notifications/push.service';
import { assertCallSignalSender } from '../modules/calls/call.policy';
import {
  callIdPayloadSchema,
  callFailedPayloadSchema,
  iceCandidatePayloadSchema,
  outgoingCallPayloadSchema,
  signalPayloadSchema,
} from '../modules/calls/call.validation';
import {
  userRoom,
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
} from './socketEvents';

type SocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

const timeoutByCallId = new Map<string, NodeJS.Timeout>();

const otherParticipantId = (call: ReturnType<typeof toCallResponse>, userId: string) => {
  if (call.caller.id === userId) return call.recipient.id;
  if (call.recipient.id === userId) return call.caller.id;
  throw new HttpError(403, 'Not a participant in this call', 'NOT_AUTHORIZED');
};

const emitFailure = (socket: AuthenticatedSocket, error: unknown, callId?: string) => {
  if (error instanceof HttpError) {
    const payload = {
      ...(callId ? { callId } : {}),
      code: error.code ?? 'CALL_ERROR',
      message: error.message,
    };
    if (error.code === 'USER_BUSY') socket.emit('call:busy', payload);
    else socket.emit('call:failed', payload);
    return;
  }
  if (error instanceof z.ZodError) {
    socket.emit('call:failed', {
      ...(callId ? { callId } : {}),
      code: 'VALIDATION_ERROR',
      message: error.issues[0]?.message ?? 'Invalid call event payload',
    });
    return;
  }
  socket.emit('call:failed', {
    ...(callId ? { callId } : {}),
    code: 'INTERNAL_ERROR',
    message: 'Unable to process call event',
  });
};

const clearCallTimeout = (callId: string) => {
  const timer = timeoutByCallId.get(callId);
  if (timer) clearTimeout(timer);
  timeoutByCallId.delete(callId);
};

const scheduleCallTimeout = (io: SocketServer, callId: string) => {
  clearCallTimeout(callId);
  const timer = setTimeout(() => {
    timeoutByCallId.delete(callId);
    callService.expireRinging(callId).then(async call => {
      if (!call || call.state !== 'timeout') return;
      const response = toCallResponse(call);
      await publishCallActivity(io, response);
      io.to(userRoom(response.caller.id)).emit('call:timeout', response);
      io.to(userRoom(response.recipient.id)).emit('call:timeout', response);
    }).catch(() => {
      console.error('Unable to expire ringing call');
    });
  }, 45_000);
  timeoutByCallId.set(callId, timer);
};

const emitCallToParticipants = (
  io: SocketServer,
  call: ReturnType<typeof toCallResponse>,
  event: 'call:accepted' | 'call:connected' | 'call:ended' | 'call:failed',
) => {
  io.to(userRoom(call.caller.id)).emit(event, call);
  io.to(userRoom(call.recipient.id)).emit(event, call);
};

const terminalEvent = (
  state: ReturnType<typeof toCallResponse>['state'],
):
  | 'call:ended'
  | 'call:rejected'
  | 'call:cancelled'
  | 'call:failed'
  | 'call:timeout' => {
  if (state === 'rejected') return 'call:rejected';
  if (state === 'cancelled') return 'call:cancelled';
  if (state === 'missed' || state === 'timeout') return 'call:timeout';
  if (state === 'failed') return 'call:failed';
  return 'call:ended';
};

const handleOutgoing = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
) => {
  const parsed = outgoingCallPayloadSchema.parse(payload);
  const recipientSockets = await io.in(userRoom(parsed.recipientId)).fetchSockets();
  const call = await callService.start(
    socket.data.userId,
    parsed.recipientId,
    parsed.kind,
    recipientSockets.length > 0,
  );
  await publishCallActivity(io, call);
  socket.emit('call:outgoing', call);
  if (call.state === 'ringing') {
    io.to(userRoom(call.recipient.id)).emit('call:incoming', call);
    pushService.sendIncomingCall({
      recipientId: call.recipient.id,
      callerId: call.caller.id,
      callId: call.id,
      kind: call.kind,
    }).catch(error => {
      console.error('Incoming call push delivery failed', {
        callId: call.id,
        code: typeof error === 'object' && error !== null && 'code' in error
          ? String(error.code)
          : 'FCM_SEND_FAILED',
      });
    });
    scheduleCallTimeout(io, call.id);
  } else if (call.state === 'unavailable') {
    socket.emit('call:unavailable', call);
  }
};

const handleAccept = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
) => {
  const { callId } = callIdPayloadSchema.parse(payload);
  const call = await callService.accept(callId, socket.data.userId);
  await publishCallActivity(io, call);
  clearCallTimeout(callId);
  emitCallToParticipants(io, call, 'call:accepted');
};

const handleFinish = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
  outcome: 'ended' | 'rejected' | 'cancelled' | 'failed',
) => {
  const { callId } = outcome === 'failed'
    ? callFailedPayloadSchema.parse(payload)
    : callIdPayloadSchema.parse(payload);
  const call = await callService.finish(callId, socket.data.userId, outcome);
  await publishCallActivity(io, call);
  clearCallTimeout(callId);
  const event = terminalEvent(call.state);
  const otherUserId = otherParticipantId(call, socket.data.userId);
  io.to(userRoom(otherUserId)).emit(event, call);
};

const handleConnected = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
) => {
  const { callId } = callIdPayloadSchema.parse(payload);
  const call = await callService.markConnected(callId, socket.data.userId);
  await publishCallActivity(io, call);
  emitCallToParticipants(io, call, 'call:connected');
};

const handleSignal = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
  event: 'call:offer' | 'call:answer',
) => {
  const { callId, sdp } = signalPayloadSchema.parse(payload);
  const call = await callService.assertSignalAccess(callId, socket.data.userId);
  const response = toCallResponse(call);
  assertCallSignalSender(
    response.caller.id,
    response.recipient.id,
    socket.data.userId,
    event === 'call:offer' ? 'offer' : 'answer',
  );
  const recipientId = otherParticipantId(response, socket.data.userId);
  io.to(userRoom(recipientId)).emit(event, { callId, sdp });
};

const handleIceCandidate = async (
  io: SocketServer,
  socket: AuthenticatedSocket,
  payload: unknown,
) => {
  const parsed = iceCandidatePayloadSchema.parse(payload);
  const call = await callService.assertSignalAccess(parsed.callId, socket.data.userId);
  const recipientId = otherParticipantId(toCallResponse(call), socket.data.userId);
  io.to(userRoom(recipientId)).emit('call:ice_candidate', {
    callId: parsed.callId,
    candidate: parsed.candidate,
  });
};

export const registerCallSocket = (
  io: SocketServer,
  socket: AuthenticatedSocket,
): void => {
  const callErrors = (event: string) => (error: unknown, callId?: string) => {
    if (error instanceof Error) console.error(`Call event failed: ${event}`);
    emitFailure(socket, error, callId);
  };

  socket.on('call:outgoing', payload => {
    handleOutgoing(io, socket, payload).catch(callErrors('outgoing'));
  });
  socket.on('call:accept', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleAccept(io, socket, payload).catch(error => callErrors('accept')(error, callId));
  });
  socket.on('call:reject', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleFinish(io, socket, payload, 'rejected').catch(error => callErrors('reject')(error, callId));
  });
  socket.on('call:cancel', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleFinish(io, socket, payload, 'cancelled').catch(error => callErrors('cancel')(error, callId));
  });
  socket.on('call:end', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleFinish(io, socket, payload, 'ended').catch(error => callErrors('end')(error, callId));
  });
  socket.on('call:failed', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleFinish(io, socket, payload, 'failed').catch(error => callErrors('failed')(error, callId));
  });
  socket.on('call:connected', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleConnected(io, socket, payload).catch(error => callErrors('connected')(error, callId));
  });
  socket.on('call:offer', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleSignal(io, socket, payload, 'call:offer').catch(error => callErrors('offer')(error, callId));
  });
  socket.on('call:answer', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleSignal(io, socket, payload, 'call:answer').catch(error => callErrors('answer')(error, callId));
  });
  socket.on('call:ice_candidate', payload => {
    const callId = typeof payload?.callId === 'string' ? payload.callId : undefined;
    handleIceCandidate(io, socket, payload).catch(error => callErrors('ice_candidate')(error, callId));
  });

  socket.on('disconnect', () => {
    io.in(userRoom(socket.data.userId)).fetchSockets().then(sockets => {
      if (sockets.length > 0) return;
      return callRepository.findActiveForUser(socket.data.userId).then(async calls => {
        for (const activeCall of calls) {
          const call = await callService.finishOnDisconnect(
            activeCall._id.toString(),
            socket.data.userId,
          );
          if (!call) continue;
          await publishCallActivity(io, call);
          clearCallTimeout(call.id);
          const otherUserId = otherParticipantId(call, socket.data.userId);
          const event = call.state === 'cancelled'
            ? 'call:cancelled'
            : call.state === 'missed'
              ? 'call:timeout'
              : call.state === 'ended'
                ? 'call:ended'
                : 'call:failed';
          io.to(userRoom(otherUserId)).emit(event, call);
        }
      });
    }).catch(() => {
      console.error('Unable to clean up calls after socket disconnect');
    });
  });
};