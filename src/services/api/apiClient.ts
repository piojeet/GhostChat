import Config from 'react-native-config';
import { Platform } from 'react-native';
import { authStorage } from '../auth/authStorage';
import { authStore } from '../../store/authStore';
import { ApiError } from './apiError';
import type { AuthResult, AuthTokens } from './apiTypes';

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  authenticated?: boolean;
  retryAfterRefresh?: boolean;
  timeoutMs?: number;
};

const configuredBaseUrl = Config.API_BASE_URL?.trim();
const developmentBaseUrl = __DEV__ ? Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
}) : undefined;
const baseUrl = (configuredBaseUrl || developmentBaseUrl)?.replace(/\/+$/, '');
let refreshPromise: Promise<AuthResult | null> | null = null;
const REQUEST_TIMEOUT_MS = 15_000;

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
};

const readResponse = async <T>(response: Response): Promise<T> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      throw new ApiError('Request failed.', response.status);
    }
    throw new ApiError(
      'The server returned an invalid response.',
      response.status,
      'INVALID_RESPONSE',
    );
  }
  if (!response.ok) {
    const errorBody = (typeof body === 'object' && body !== null ? body : {}) as {
      message?: string;
      error?: { message?: string; code?: string };
      code?: string;
    };
    throw new ApiError(
      errorBody.error?.message ?? errorBody.message ?? 'Request failed.',
      response.status,
      errorBody.error?.code ?? errorBody.code,
    );
  }
  return body as T;
};

const ensureBaseUrl = (): string => {
  if (!baseUrl) {
    throw new ApiError(
      'API_BASE_URL is not configured. Set it in the project .env file.',
      0,
      'API_NOT_CONFIGURED',
    );
  }
  if (!__DEV__) {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(baseUrl);
    } catch {
      throw new ApiError(
        'API_BASE_URL must be a public HTTPS URL in release builds.',
        0,
        'API_NOT_CONFIGURED',
      );
    }

    const hostname = parsedUrl.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    const isLocalHost =
      hostname === 'localhost' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname === '::' ||
      hostname === '::1' ||
      /^(fc|fd)[0-9a-f:]*$/i.test(hostname) ||
      hostname.startsWith('fe80:') ||
      /^(0|10|127|192\.168)\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname);
    if (parsedUrl.protocol !== 'https:' || isLocalHost) {
      throw new ApiError(
        'API_BASE_URL must be a public HTTPS URL in release builds.',
        0,
        'API_NOT_CONFIGURED',
      );
    }
  }
  return baseUrl;
};

const refreshSession = async (): Promise<AuthResult | null> => {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const tokens = await authStorage.getTokens();
      if (!tokens?.refreshToken) {
        await clearAuthSession();
        return null;
      }
      const response = await fetchWithTimeout(`${ensureBaseUrl()}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      const result = await readResponse<AuthResult>(response);
      await authStorage.setTokens(result);
      authStore.setAuthenticated(result.user);
      return result;
    } catch {
      await clearAuthSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
};

export const setAuthTokens = async (result: AuthResult): Promise<void> => {
  const tokens: AuthTokens = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  };
  await authStorage.setTokens(tokens);
  authStore.setAuthenticated(result.user);
};

export const clearAuthSession = async (): Promise<void> => {
  try {
    await authStorage.clear();
  } finally {
    authStore.setUnauthenticated();
  }
};

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const url = `${ensureBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
  const authenticated = options.authenticated ?? true;
  const tokens = authenticated ? await authStorage.getTokens() : null;
  const isMultipart = options.body instanceof FormData;
  const response = await fetchWithTimeout(url, {
    method: options.method ?? 'GET',
    headers: {
      ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
      ...(tokens?.accessToken
        ? { Authorization: `Bearer ${tokens.accessToken}` }
        : {}),
    },
    ...(options.body === undefined
      ? {}
      : { body: isMultipart ? (options.body as FormData) : JSON.stringify(options.body) }),
  }, options.timeoutMs);

  if (
    response.status === 401 &&
    authenticated &&
    options.retryAfterRefresh !== false
  ) {
    const refreshed = await refreshSession();
    if (refreshed) {
      return apiRequest<T>(path, {
        ...options,
        retryAfterRefresh: false,
      });
    }
  }

  return readResponse<T>(response);
};

export const api = {
  request: apiRequest,
  getBaseUrl: ensureBaseUrl,
};