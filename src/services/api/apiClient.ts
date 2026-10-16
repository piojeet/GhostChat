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
  diagnosticName?: string;
};

const configuredBaseUrl = Config.API_BASE_URL?.trim();
const developmentBaseUrl = __DEV__ ? Platform.select({
  android: 'http://10.0.2.2:5000/api',
  ios: 'http://localhost:5000/api',
}) : undefined;
const baseUrl = (configuredBaseUrl || developmentBaseUrl)?.replace(/\/+$/, '');
let refreshPromise: Promise<AuthResult | null> | null = null;
const REQUEST_TIMEOUT_MS = 15_000;

const getErrorName = (error: unknown): string =>
  error instanceof Error ? error.name : 'UnknownError';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Request failed';

const getErrorCode = (error: unknown): string | undefined =>
  error instanceof ApiError ? error.code : undefined;

const logRequestDiagnostic = (
  diagnosticName: string | undefined,
  event: string,
  details: {
    url: string;
    status?: number;
    error?: unknown;
    responseErrorCode?: string;
  },
): void => {
  if (!__DEV__ || !diagnosticName) return;
  const { url, status, error, responseErrorCode } = details;
  const diagnostic = {
    request: diagnosticName,
    url,
    ...(status === undefined ? {} : { status }),
    ...(error === undefined
      ? {}
      : {
          errorName: getErrorName(error),
          errorMessage: getErrorMessage(error),
          ...(getErrorCode(error) ? { errorCode: getErrorCode(error) } : {}),
        }),
    ...(responseErrorCode ? { responseErrorCode } : {}),
  };
  if (error || responseErrorCode) {
    console.warn(`[api] ${event}`, diagnostic);
  } else {
    console.info(`[api] ${event}`, diagnostic);
  }
};

const fetchWithTimeout = async (
  url: string,
  init: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> => {
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (error) {
    if (timedOut) {
      const timeoutError = new ApiError(
        'The server took too long to respond. Check your connection and try again.',
        0,
        'REQUEST_TIMEOUT',
      );
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    if (getErrorName(error) === 'AbortError') {
      const abortError = new ApiError(
        'The sign-in request was cancelled before it completed. Please try again.',
        0,
        'REQUEST_ABORTED',
      );
      abortError.name = 'AbortError';
      throw abortError;
    }
    if (/network request failed|failed to fetch|network error/i.test(getErrorMessage(error))) {
      const networkError = new ApiError(
        'Unable to reach the server. Check your internet connection and API address.',
        0,
        'NETWORK_ERROR',
      );
      networkError.name = 'NetworkError';
      throw networkError;
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

const readResponse = async <T>(
  response: Response,
  diagnosticName?: string,
  url?: string,
): Promise<T> => {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    if (!response.ok) {
      const error = new ApiError('Request failed.', response.status);
      logRequestDiagnostic(diagnosticName, 'request failed', {
        url: url ?? '',
        status: response.status,
        error,
      });
      throw error;
    }
    const error = new ApiError(
      'The server returned an invalid response.',
      response.status,
      'INVALID_RESPONSE',
    );
    logRequestDiagnostic(diagnosticName, 'request failed', {
      url: url ?? '',
      status: response.status,
      error,
    });
    throw error;
  }
  if (!response.ok) {
    const errorBody = (typeof body === 'object' && body !== null ? body : {}) as {
      message?: string;
      error?: { message?: string; code?: string };
      code?: string;
    };
    const responseErrorCode = errorBody.error?.code ?? errorBody.code;
    const error = new ApiError(
      errorBody.error?.message ?? errorBody.message ?? 'Request failed.',
      response.status,
      responseErrorCode,
    );
    logRequestDiagnostic(diagnosticName, 'request failed', {
      url: url ?? '',
      status: response.status,
      error,
      responseErrorCode,
    });
    throw error;
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
  logRequestDiagnostic(options.diagnosticName, 'request started', { url });
  let response: Response;
  try {
    response = await fetchWithTimeout(url, {
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
  } catch (error) {
    logRequestDiagnostic(options.diagnosticName, 'request failed', {
      url,
      status: error instanceof ApiError ? error.status : undefined,
      error,
      responseErrorCode: getErrorCode(error),
    });
    throw error;
  }
  logRequestDiagnostic(options.diagnosticName, 'response received', {
    url,
    status: response.status,
  });

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

  return readResponse<T>(response, options.diagnosticName, url);
};

export const api = {
  request: apiRequest,
  getBaseUrl: ensureBaseUrl,
};