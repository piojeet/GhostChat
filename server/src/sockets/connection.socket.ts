import type { Socket } from 'socket.io';
import { Types } from 'mongoose';
import { HttpError } from '../utils/httpError';
import { verifyAccessToken } from '../utils/jwt';
import { User } from '../modules/users/user.model';
import { userRoom } from './socketEvents';
import type {
  ClientToServerEvents,
  InterServerEvents,
  ServerToClientEvents,
  SocketData,
} from './socketEvents';

type AuthenticatedSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

export const authenticateSocket = async (
  socket: AuthenticatedSocket,
  next: (error?: Error) => void,
): Promise<void> => {
  const accessToken = socket.handshake.auth.accessToken;
  if (typeof accessToken !== 'string' || !accessToken) {
    next(Object.assign(new Error('Authentication required'), {
      data: { code: 'UNAUTHENTICATED' },
    }));
    return;
  }

  try {
    const payload = verifyAccessToken(accessToken);
    if (!Types.ObjectId.isValid(payload.sub)) {
      next(Object.assign(new Error('Invalid access token'), {
        data: { code: 'INVALID_TOKEN' },
      }));
      return;
    }
    const activeUser = await User.exists({
      _id: payload.sub,
      isActive: true,
      isEmailVerified: true,
    });
    if (!activeUser) {
      next(Object.assign(new Error('Authenticated user is unavailable'), {
        data: { code: 'UNAUTHENTICATED' },
      }));
      return;
    }
    if (payload.exp !== undefined && payload.exp * 1000 <= Date.now()) {
      next(Object.assign(new Error('Access token has expired'), {
        data: { code: 'INVALID_TOKEN' },
      }));
      return;
    }
    socket.data.userId = payload.sub;
    await socket.join(userRoom(payload.sub));
    const expiresAt = payload.exp;
    if (expiresAt !== undefined) {
      let expiryTimer: NodeJS.Timeout | undefined;
      const scheduleExpiry = (): void => {
        const remaining = expiresAt * 1000 - Date.now();
        if (remaining <= 0) {
          socket.disconnect(true);
          return;
        }
        expiryTimer = setTimeout(
          scheduleExpiry,
          Math.min(remaining, 2_147_483_647),
        );
      };
      scheduleExpiry();
      socket.once('disconnect', () => {
        if (expiryTimer) clearTimeout(expiryTimer);
      });
    }
    next();
  } catch (error) {
    const authError = error instanceof Error ? error : new Error('Authentication failed');
    next(Object.assign(authError, {
      data: {
        code: authError instanceof HttpError
          ? authError.code ?? 'UNAUTHENTICATED'
          : 'UNAUTHENTICATED',
      },
    }));
  }
};