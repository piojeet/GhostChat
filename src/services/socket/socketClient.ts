import { io, type Socket } from 'socket.io-client';
import {
  api,
  apiRequest,
  clearAuthSession,
  setAuthTokens,
} from '../api/apiClient';
import { authStorage } from '../auth/authStorage';
import { authStore } from '../../store/authStore';
import type { AuthResult } from '../api/apiTypes';
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from './socketEvents';

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: ChatSocket | null = null;
let connectionGeneration = 0;
let refreshingAccessToken = false;
let accessRefreshAttempted = false;

const getSocketOrigin = (): string => new URL(api.getBaseUrl()).origin;

const refreshAccessToken = async (activeSocket: ChatSocket): Promise<void> => {
  if (refreshingAccessToken || !authStore.getState().isAuthenticated) return;
  refreshingAccessToken = true;
  try {
    const tokens = await authStorage.getTokens();
    if (!tokens?.refreshToken) {
      await clearAuthSession();
      return;
    }
    const result = await apiRequest<AuthResult>('/auth/refresh', {
      method: 'POST',
      authenticated: false,
      body: { refreshToken: tokens.refreshToken },
    });
    if (!authStore.getState().isAuthenticated) return;
    await setAuthTokens(result);
    activeSocket.auth = { accessToken: result.accessToken };
    activeSocket.connect();
  } catch {
    console.error('Realtime token refresh failed; clearing the local session');
    await clearAuthSession();
  } finally {
    refreshingAccessToken = false;
  }
};

export const getSocketClient = (): ChatSocket => {
  if (socket) return socket;

  socket = io(getSocketOrigin(), {
    autoConnect: false,
    transports: ['websocket', 'polling'],
    auth: {},
  });
  socket.on('connect', () => {
    accessRefreshAttempted = false;
  });
  socket.on('connect_error', error => {
    const code = (error as Error & { data?: { code?: string } }).data?.code;
    const activeSocket = socket;
    if (code === 'INVALID_TOKEN' && activeSocket) {
      if (accessRefreshAttempted) {
        clearAuthSession().catch(() => {
          console.error('Unable to clear an invalid realtime session');
        });
      } else {
        accessRefreshAttempted = true;
        activeSocket.disconnect();
        refreshAccessToken(activeSocket).catch(() => {
          console.error('Unable to refresh realtime authentication');
        });
      }
    } else if (code === 'UNAUTHENTICATED') {
      clearAuthSession().catch(() => {
        console.error('Unable to clear an unauthenticated realtime session');
      });
    }
  });
  socket.on('disconnect', reason => {
    if (reason === 'io server disconnect' && authStore.getState().isAuthenticated) {
      const activeSocket = socket;
      if (!activeSocket) return;
      if (accessRefreshAttempted) {
        clearAuthSession().catch(() => {
          console.error('Unable to clear a disconnected realtime session');
        });
        return;
      }
      accessRefreshAttempted = true;
      refreshAccessToken(activeSocket).catch(() => {
        console.error('Unable to restore the authenticated chat connection');
      });
    }
  });
  return socket;
};

export const connectSocket = async (): Promise<void> => {
  const activeSocket = getSocketClient();
  const generation = ++connectionGeneration;
  accessRefreshAttempted = false;
  const tokens = await authStorage.getTokens();
  if (generation !== connectionGeneration) return;
  if (!tokens?.accessToken) {
    await clearAuthSession();
    return;
  }
  activeSocket.auth = { accessToken: tokens.accessToken };
  if (!activeSocket.connected) activeSocket.connect();
};

export const disconnectSocket = (): void => {
  connectionGeneration += 1;
  socket?.disconnect();
};