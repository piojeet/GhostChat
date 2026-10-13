import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from './env';
import { authenticateSocket } from '../sockets/connection.socket';
import { registerChatSocket } from '../sockets/chat.socket';
import { registerCallSocket } from '../sockets/call.socket';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from '../sockets/socketEvents';

let socketServer: Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
> | null = null;

export const initializeSocketServer = (httpServer: HttpServer) => {
  if (socketServer) {
    throw new Error('Socket.IO server has already been initialized');
  }

  const io = new Server<
    ClientToServerEvents,
    ServerToClientEvents,
    InterServerEvents,
    SocketData
  >(httpServer, {
    cors: {
      origin: env.CLIENT_URL,
      credentials: true,
    },
  });
  io.use(authenticateSocket);
  io.on('connection', socket => {
    registerCallSocket(io, socket);
    registerChatSocket(io, socket).catch(() => {
      console.error('Unable to initialize authenticated chat socket');
      socket.disconnect(true);
    });
  });
  socketServer = io;
  return io;
};

export const getSocketServer = () => {
  if (!socketServer) {
    throw new Error('Socket.IO server has not been initialized');
  }
  return socketServer;
};