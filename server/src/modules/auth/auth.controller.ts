import type { RequestHandler } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { authService } from './auth.service';
import {
  emailSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resendOtpSchema,
  resetPasswordSchema,
  verifyOtpSchema,
} from './auth.validation';

export const register: RequestHandler = asyncHandler(async (request, response) => {
  const result = await authService.register(registerSchema.parse(request.body));
  response.status(201).json({
    ...result,
    message: 'Account created. Verify your email to sign in.',
  });
});

export const verifyOtp: RequestHandler = asyncHandler(async (request, response) => {
  const { purpose, ...input } = verifyOtpSchema.parse(request.body);
  if (purpose === 'password-reset') {
    await authService.verifyPasswordOtp(input);
    response.status(200).json({ verified: true });
    return;
  }
  const result = await authService.verifyOtp(input);
  response.status(200).json(result);
});

export const resendOtp: RequestHandler = asyncHandler(async (request, response) => {
  const { email, purpose } = resendOtpSchema.parse(request.body);
  await authService.resendOtp(email, purpose);
  response.status(200).json({ message: 'If the account can receive a code, one has been sent.' });
});

export const login: RequestHandler = asyncHandler(async (request, response) => {
  const result = await authService.login(loginSchema.parse(request.body));
  response.status(200).json(result);
});

export const refresh: RequestHandler = asyncHandler(async (request, response) => {
  const { refreshToken } = refreshSchema.parse(request.body);
  response.status(200).json(await authService.refresh(refreshToken));
});

export const logout: RequestHandler = asyncHandler(async (request, response) => {
  const refreshToken =
    typeof request.body?.refreshToken === 'string' ? request.body.refreshToken : undefined;
  await authService.logout(refreshToken);
  response.status(200).json({ message: 'Logged out' });
});

export const me: RequestHandler = asyncHandler(async (request, response) => {
  response.status(200).json({
    user: await authService.currentUser(request.authUserId!),
  });
});

export const forgotPassword: RequestHandler = asyncHandler(async (request, response) => {
  const { email } = emailSchema.parse(request.body);
  await authService.forgotPassword(email);
  response.status(200).json({
    message: 'If an account exists for that email, a verification code has been sent.',
  });
});

export const resetPassword: RequestHandler = asyncHandler(async (request, response) => {
  await authService.resetPassword(resetPasswordSchema.parse(request.body));
  response.status(200).json({
    message: 'Password updated. Sign in with your new password.',
  });
});