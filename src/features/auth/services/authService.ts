import {
  apiRequest,
  clearAuthSession,
  setAuthTokens,
} from '../../../services/api/apiClient';
import { authStorage } from '../../../services/auth/authStorage';
import type { AuthResult } from '../../../services/api/apiTypes';
import { unregisterPushDevice } from '../../../services/notifications/pushNotifications';

type LoginInput = {
  email: string;
  password: string;
};

type RegisterInput = {
  username: string;
  email: string;
  password: string;
  displayName: string;
};

type OtpInput = {
  email: string;
  otp: string;
};

export const authService = {
  async login(input: LoginInput): Promise<AuthResult> {
    const result = await apiRequest<AuthResult>('/auth/login', {
      method: 'POST',
      authenticated: false,
      body: input,
    });
    await setAuthTokens(result);
    return result;
  },

  register(
    input: RegisterInput,
  ): Promise<{ email: string; verificationRequired: true }> {
    return apiRequest('/auth/register', {
      method: 'POST',
      authenticated: false,
      body: input,
    });
  },

  async verifyRegistration(input: OtpInput): Promise<AuthResult> {
    const result = await apiRequest<AuthResult>('/auth/verify-otp', {
      method: 'POST',
      authenticated: false,
      body: input,
    });
    await setAuthTokens(result);
    return result;
  },

  verifyPasswordOtp(input: OtpInput): Promise<{ verified: true }> {
    return apiRequest('/auth/verify-otp', {
      method: 'POST',
      authenticated: false,
      body: { ...input, purpose: 'password-reset' },
    });
  },

  resendOtp(
    email: string,
    purpose: 'registration' | 'password-reset',
  ): Promise<{ message: string }> {
    return apiRequest('/auth/resend-otp', {
      method: 'POST',
      authenticated: false,
      body: { email, purpose },
    });
  },

  forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest('/auth/forgot-password', {
      method: 'POST',
      authenticated: false,
      body: { email },
    });
  },

  resetPassword(
    input: OtpInput & { password: string },
  ): Promise<{ message: string }> {
    return apiRequest('/auth/reset-password', {
      method: 'POST',
      authenticated: false,
      body: input,
    });
  },

  async logout(): Promise<void> {
    try {
      try {
        await unregisterPushDevice();
      } catch (pushError) {
        console.error('Unable to unregister push notifications during logout', {
          message: pushError instanceof Error ? pushError.message : 'Request failed',
        });
      }
      const tokens = await authStorage.getTokens();
      await apiRequest('/auth/logout', {
        method: 'POST',
        body: { refreshToken: tokens?.refreshToken },
      });
    } finally {
      await clearAuthSession();
    }
  },
};