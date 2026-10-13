import type { Server } from 'socket.io';
import {
  type ClientToServerEvents,
  type InterServerEvents,
  type ServerToClientEvents,
  type SocketData,
  userRoom,
} from '../../sockets/socketEvents';
import { callService } from './call.service';
import type { CallResponse } from './call.types';

type CallSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export const publishCallActivity = async (
  io: CallSocketServer,
  call: CallResponse,
): Promise<void> => {
  const activity = await callService.syncCallActivity(call);
  if (!activity) return;
  io.to(userRoom(call.caller.id)).emit('message:new', activity);
  io.to(userRoom(call.recipient.id)).emit('message:new', activity);
};
