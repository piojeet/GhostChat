import { useEffect } from 'react';
import {
  connectSocket,
  disconnectSocket,
  getSocketClient,
} from '../services/socket/socketClient';

export const useSocket = (isAuthenticated: boolean) => {
  useEffect(() => {
    if (isAuthenticated) {
      connectSocket().catch(() => {
        console.error('Unable to initialize the authenticated chat socket');
      });
      return disconnectSocket;
    }
    disconnectSocket();
  }, [isAuthenticated]);

  return getSocketClient();
};