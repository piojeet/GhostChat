import { apiRequest, setAuthTokens } from '../../../services/api/apiClient';
import { authService } from './authService';

jest.mock('../../../services/api/apiClient', () => ({
  apiRequest: jest.fn(),
  setAuthTokens: jest.fn(),
  clearAuthSession: jest.fn(),
}));
jest.mock('../../../services/auth/authStorage', () => ({
  authStorage: { getTokens: jest.fn().mockResolvedValue(null) },
}));
jest.mock('../../../services/notifications/pushNotifications', () => ({
  unregisterPushDevice: jest.fn(),
}));

describe('authService.login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts email and password with a cold-start-safe timeout, then stores tokens', async () => {
    const result = {
      user: {
        id: 'user-1',
        username: 'tester',
        email: 'tester@example.test',
        displayName: 'Tester',
        isEmailVerified: true,
        avatar: null,
        gender: null,
      },
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    };
    (apiRequest as jest.Mock).mockResolvedValue(result);

    await expect(authService.login({
      email: 'tester@example.test',
      password: 'SensitivePassword1!',
    })).resolves.toBe(result);

    expect(apiRequest).toHaveBeenCalledWith('/auth/login', {
      method: 'POST',
      authenticated: false,
      body: {
        email: 'tester@example.test',
        password: 'SensitivePassword1!',
      },
      timeoutMs: 90_000,
      diagnosticName: 'auth.login',
    });
    expect(setAuthTokens).toHaveBeenCalledWith(result);
  });

  it('does not store tokens when the backend rejects login', async () => {
    const error = Object.assign(new Error('Email or password is incorrect'), {
      status: 401,
      code: 'INVALID_CREDENTIALS',
    });
    (apiRequest as jest.Mock).mockRejectedValue(error);

    await expect(authService.login({
      email: 'tester@example.test',
      password: 'SensitivePassword1!',
    })).rejects.toBe(error);
    expect(setAuthTokens).not.toHaveBeenCalled();
  });
});
