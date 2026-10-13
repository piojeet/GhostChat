import type { RequestHandler } from 'express';
import { getSocketServer } from '../../config/socket';
import { asyncHandler } from '../../utils/asyncHandler';
import { HttpError } from '../../utils/httpError';
import { userRoom } from '../../sockets/socketEvents';
import { callService, toCallResponse } from './call.service';
import { publishCallActivity } from './call.realtime';
import { pushService } from '../notifications/push.service';
import {
  callHistoryQuerySchema,
  callIdParamsSchema,
  startCallBodySchema,
} from './call.validation';

const authenticatedUserId = (request: Parameters<RequestHandler>[0]): string => {
  if (!request.authUserId) {
    throw new HttpError(401, 'Authentication required', 'UNAUTHENTICATED');
  }
  return request.authUserId;
};

const emitToOtherParticipant = (
  call: ReturnType<typeof toCallResponse>,
  userId: string,
  event: 'call:rejected' | 'call:cancelled' | 'call:ended' | 'call:failed' | 'call:accepted',
) => {
  const otherUserId = call.caller.id === userId ? call.recipient.id : call.caller.id;
  getSocketServer().to(userRoom(otherUserId)).emit(event, call);
};

export const start: RequestHandler = asyncHandler(async (request, response) => {
  const body = startCallBodySchema.parse(request.body);
  const io = getSocketServer();
  const userId = authenticatedUserId(request);
  const recipientOnline = (await io.in(userRoom(body.recipientId)).fetchSockets()).length > 0;
  const call = await callService.start(userId, body.recipientId, body.kind, recipientOnline);
  await publishCallActivity(io, call);
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
  }
  response.status(201).json({ call });
});

export const accept: RequestHandler = asyncHandler(async (request, response) => {
  const { callId } = callIdParamsSchema.parse(request.params);
  const call = await callService.accept(callId, authenticatedUserId(request));
  await publishCallActivity(getSocketServer(), call);
  emitToOtherParticipant(call, authenticatedUserId(request), 'call:accepted');
  response.status(200).json({ call });
});

const finishHandler = (
  outcome: 'ended' | 'rejected' | 'cancelled' | 'failed',
  event: 'call:rejected' | 'call:cancelled' | 'call:ended' | 'call:failed',
): RequestHandler =>
  asyncHandler(async (request, response) => {
    const { callId } = callIdParamsSchema.parse(request.params);
    const userId = authenticatedUserId(request);
    const call = await callService.finish(callId, userId, outcome);
    await publishCallActivity(getSocketServer(), call);
    emitToOtherParticipant(call, userId, event);
    response.status(200).json({ call });
  });

export const reject = finishHandler('rejected', 'call:rejected');
export const cancel = finishHandler('cancelled', 'call:cancelled');
export const end = finishHandler('ended', 'call:ended');
export const fail = finishHandler('failed', 'call:failed');

export const getHistory: RequestHandler = asyncHandler(async (request, response) => {
  const query = callHistoryQuerySchema.parse(request.query);
  response.status(200).json(
    await callService.history(authenticatedUserId(request), query.page, query.limit),
  );
});

export const getIceServers: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json(await callService.getIceServers(authenticatedUserId(request)));
});