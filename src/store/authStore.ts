import type { AuthUser } from '../services/api/apiTypes';

export type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isRestoring: boolean;
};

let state: AuthState = {
  user: null,
  isAuthenticated: false,
  isRestoring: true,
};
const listeners = new Set<() => void>();

const update = (nextState: AuthState): void => {
  state = nextState;
  listeners.forEach(listener => listener());
};

export const authStore = {
  getState: (): AuthState => state,
  subscribe: (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setAuthenticated: (user: AuthUser): void =>
    update({ user, isAuthenticated: true, isRestoring: false }),
  updateProfile: (profile: Pick<AuthUser, 'id' | 'username' | 'displayName'> & Partial<Pick<AuthUser, 'avatar' | 'bio' | 'gender'>>): void => {
    if (!state.user || state.user.id !== profile.id) return;
    update({
      ...state,
      user: { ...state.user, ...profile },
    });
  },
  setUnauthenticated: (): void =>
    update({ user: null, isAuthenticated: false, isRestoring: false }),
  setRestoring: (): void => update({ ...state, isRestoring: true }),
};