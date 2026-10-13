import { useCallback, useSyncExternalStore } from 'react';
import { authService } from '../services/authService';
import { authStorage } from '../../../services/auth/authStorage';
import { authStore } from '../../../store/authStore';
import {
  apiRequest,
  clearAuthSession,
  setAuthTokens,
} from '../../../services/api/apiClient';
import type { AuthResult } from '../../../services/api/apiTypes';

export const useAuth = () => {
  const state = useSyncExternalStore(
    authStore.subscribe,
    authStore.getState,
    authStore.getState,
  );

  const restoreSession = useCallback(async (): Promise<boolean> => {
    authStore.setRestoring();
    try {
      const tokens = await authStorage.getTokens();
      if (!tokens) {
        authStore.setUnauthenticated();
        return false;
      }
      const result = await apiRequest<AuthResult>('/auth/refresh', {
        method: 'POST',
        authenticated: false,
        body: { refreshToken: tokens.refreshToken },
      });
      await setAuthTokens(result);
      return true;
    } catch {
      await clearAuthSession();
      return false;
    }
  }, []);

  const logout = useCallback(() => authService.logout(), []);

  return { ...state, restoreSession, logout };
};