import { apiRequest } from './apiClient';

jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://api.example.test/api',
}));
jest.mock('../auth/authStorage', () => ({
  authStorage: {
    getTokens: jest.fn().mockResolvedValue(null),
    setTokens: jest.fn(),
    clear: jest.fn(),
  },
}));
jest.mock('../../store/authStore', () => ({
  authStore: {
    getState: jest.fn(() => ({ isAuthenticated: false })),
    setAuthenticated: jest.fn(),
    setUnauthenticated: jest.fn(),
  },
}));

const makeResponse = (status: number, body: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as Response;

describe('apiRequest network errors', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('identifies an API timeout distinctly from other request failures', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn((_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
        });
      }),
    ) as jest.Mock;

    const request = apiRequest('/auth/login', {
      method: 'POST',
      authenticated: false,
      body: { email: 'test@example.test', password: 'not-logged' },
      timeoutMs: 100,
      diagnosticName: 'auth.login',
    });
    const rejection = expect(request).rejects.toMatchObject({
      name: 'TimeoutError',
      status: 0,
      code: 'REQUEST_TIMEOUT',
    });
    await jest.advanceTimersByTimeAsync(100);
    await rejection;
  });

  it('reports an unreachable backend as a network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed'));

    await expect(apiRequest('/auth/login', {
      method: 'POST',
      authenticated: false,
      body: { email: 'test@example.test', password: 'not-logged' },
      diagnosticName: 'auth.login',
    })).rejects.toMatchObject({
      name: 'NetworkError',
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });

  it('preserves the backend invalid-credentials status and code', async () => {
    global.fetch = jest.fn().mockResolvedValue(makeResponse(401, {
      error: { code: 'INVALID_CREDENTIALS', message: 'Email or password is incorrect' },
    }));

    await expect(apiRequest('/auth/login', {
      method: 'POST',
      authenticated: false,
      body: { email: 'test@example.test', password: 'not-logged' },
      diagnosticName: 'auth.login',
    })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      code: 'INVALID_CREDENTIALS',
      message: 'Email or password is incorrect',
    });
  });

  it('clears its timeout after receiving a response', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue(makeResponse(200, { success: true }));

    await expect(apiRequest('/auth/login', {
      method: 'POST',
      authenticated: false,
      body: { email: 'test@example.test', password: 'not-logged' },
      timeoutMs: 100,
    })).resolves.toEqual({ success: true });
    expect(jest.getTimerCount()).toBe(0);
  });
});
