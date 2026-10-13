import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { Types } from 'mongoose';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';
import { comparePassword, hashPassword } from '../../utils/password';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  refreshExpiresAt,
  verifyRefreshToken,
} from '../../utils/jwt';
import { authRepository } from './auth.repository';
import type {
  AuthResult,
  LoginInput,
  OtpInput,
  PublicUser,
  RegisterInput,
  ResetPasswordInput,
} from './auth.types';

const otpTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_PORT === 465,
  auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
});

const publicUser = (user: {
  _id: { toString(): string };
  username: string;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  avatar?: string | null;
  gender?: 'male' | 'female' | null;
}): PublicUser => ({
  id: user._id.toString(),
  username: user.username,
  email: user.email,
  displayName: user.displayName,
  isEmailVerified: user.isEmailVerified,
  avatar: user.avatar ?? null,
  gender: user.gender ?? null,
});

const createAuthResult = async (
  user: NonNullable<Awaited<ReturnType<typeof authRepository.findUserByEmail>>>,
): Promise<AuthResult> => {
  const sessionId = new Types.ObjectId();
  const refreshToken = createRefreshToken(user._id, sessionId);
  await authRepository.createSession(
    user._id,
    hashRefreshToken(refreshToken),
    refreshExpiresAt(),
    sessionId,
  );
  return {
    user: publicUser(user),
    accessToken: createAccessToken(user._id),
    refreshToken,
  };
};

const generateOtp = (): string =>
  crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');

const sendOtp = async (
  email: string,
  otp: string,
  purpose: 'registration' | 'password-reset',
): Promise<void> => {
  const action = purpose === 'registration' ? 'verify your email' : 'reset your password';
  await otpTransporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'Your SnapApp verification code',
    text: `Use ${otp} to ${action}. This code expires in ${env.OTP_EXPIRES_MINUTES} minutes.`,
    html: `<p>Use <strong>${otp}</strong> to ${action}.</p><p>This code expires in ${env.OTP_EXPIRES_MINUTES} minutes.</p>`,
  });
};

const issueOtp = async (
  email: string,
  userId: NonNullable<Awaited<ReturnType<typeof authRepository.findUserByEmail>>>['_id'],
  purpose: 'registration' | 'password-reset',
): Promise<void> => {
  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  await authRepository.createChallenge({
    email,
    userId,
    purpose,
    otpHash,
    expiresAt: new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000),
  });

  try {
    await sendOtp(email, otp, purpose);
  } catch (error) {
    await authRepository.deleteChallenge(email, purpose);
    console.error('OTP email delivery failed', error);
    throw new HttpError(
      503,
      'Unable to send verification email. Please try again later.',
      'EMAIL_DELIVERY_FAILED',
    );
  }
};

export const authService = {
  async register(
    input: RegisterInput,
  ): Promise<{ email: string; verificationRequired: true }> {
    if (await authRepository.findUserByUsernameOrEmail(input.username, input.email)) {
      throw new HttpError(409, 'Email or username is already in use', 'DUPLICATE_ACCOUNT');
    }

    const user = await authRepository.createUser({
      username: input.username,
      email: input.email,
      passwordHash: await hashPassword(input.password),
      displayName: input.displayName,
      isActive: false,
    });
    try {
      await issueOtp(user.email, user._id, 'registration');
    } catch (error) {
      await user.deleteOne();
      throw error;
    }
    return { email: user.email, verificationRequired: true };
  },

  async verifyOtp(input: OtpInput): Promise<AuthResult> {
    const challenge = await authRepository.findChallenge(input.email, 'registration');
    if (!challenge || !(await bcrypt.compare(input.otp, challenge.otpHash))) {
      if (challenge) {
        await authRepository.recordChallengeFailure(challenge._id);
      }
      throw new HttpError(400, 'Invalid or expired verification code', 'INVALID_OTP');
    }
    if (!(await authRepository.consumeChallenge(challenge._id))) {
      throw new HttpError(400, 'Invalid or expired verification code', 'INVALID_OTP');
    }
    const user = await authRepository.updateUserVerified(challenge.userId);
    if (!user) {
      throw new HttpError(400, 'Account is already verified or unavailable', 'INVALID_ACCOUNT');
    }
    return createAuthResult(user);
  },

  async verifyPasswordOtp(input: OtpInput): Promise<void> {
    const challenge = await authRepository.findChallenge(input.email, 'password-reset');
    if (!challenge || !(await bcrypt.compare(input.otp, challenge.otpHash))) {
      if (challenge) {
        await authRepository.recordChallengeFailure(challenge._id);
      }
      throw new HttpError(400, 'Invalid or expired verification code', 'INVALID_OTP');
    }
  },

  async resendOtp(
    email: string,
    purpose: 'registration' | 'password-reset',
  ): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    if (!user || (purpose === 'registration' && user.isEmailVerified)) {
      if (purpose === 'password-reset') {
        return;
      }
      throw new HttpError(400, 'No pending registration was found', 'INVALID_ACCOUNT');
    }
    try {
      await issueOtp(user.email, user._id, purpose);
    } catch (error) {
      if (
        purpose !== 'password-reset' ||
        !(error instanceof HttpError) ||
        error.code !== 'EMAIL_DELIVERY_FAILED'
      ) {
        throw error;
      }
    }
  },

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await authRepository.findUserByEmail(input.email);
    const passwordMatches =
      user?.passwordHash && (await comparePassword(input.password, user.passwordHash));
    if (!user || !passwordMatches) {
      throw new HttpError(401, 'Email or password is incorrect', 'INVALID_CREDENTIALS');
    }
    if (!user.isEmailVerified) {
      throw new HttpError(403, 'Verify your email before signing in', 'EMAIL_NOT_VERIFIED');
    }
    if (!user.isActive) {
      throw new HttpError(403, 'This account is disabled', 'ACCOUNT_DISABLED');
    }
    return createAuthResult(user);
  },

  async refresh(refreshToken: string): Promise<AuthResult> {
    const payload = verifyRefreshToken(refreshToken);
    const sessionId = payload.sessionId;
    if (!sessionId) {
      throw new HttpError(401, 'Invalid refresh token', 'INVALID_TOKEN');
    }
    const session = await authRepository.findSession(sessionId);
    const tokenHash = hashRefreshToken(refreshToken);
    if (!session || session.userId.toString() !== payload.sub) {
      throw new HttpError(401, 'Invalid or expired refresh token', 'INVALID_TOKEN');
    }
    if (session.refreshTokenHash !== tokenHash) {
      await authRepository.deleteSession(session._id.toString());
      throw new HttpError(401, 'Refresh token has already been used', 'TOKEN_REUSED');
    }
    const user = await authRepository.findUserById(payload.sub);
    if (!user || !user.isActive || !user.isEmailVerified) {
      await authRepository.deleteSession(session._id.toString());
      throw new HttpError(401, 'Session is no longer valid', 'INVALID_SESSION');
    }

    const nextRefreshToken = createRefreshToken(user._id, session._id);
    const rotated = await authRepository.rotateSession(
      session._id.toString(),
      tokenHash,
      hashRefreshToken(nextRefreshToken),
      refreshExpiresAt(),
    );
    if (!rotated) {
      throw new HttpError(401, 'Refresh token has already been used', 'TOKEN_REUSED');
    }
    return {
      user: publicUser(user),
      accessToken: createAccessToken(user._id),
      refreshToken: nextRefreshToken,
    };
  },

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) {
      return;
    }
    try {
      const payload = verifyRefreshToken(refreshToken);
      if (payload.sessionId) {
        await authRepository.deleteSession(
          payload.sessionId,
          hashRefreshToken(refreshToken),
        );
      }
    } catch (error) {
      if (!(error instanceof HttpError) || error.code !== 'INVALID_TOKEN') {
        throw error;
      }
    }
  },

  async currentUser(userId: string): Promise<PublicUser> {
    const user = await authRepository.findUserById(userId);
    if (!user || !user.isActive || !user.isEmailVerified) {
      throw new HttpError(401, 'Session is no longer valid', 'INVALID_SESSION');
    }
    return publicUser(user);
  },

  async forgotPassword(email: string): Promise<void> {
    const user = await authRepository.findUserByEmail(email);
    if (user && user.isEmailVerified && user.isActive) {
      try {
        await issueOtp(user.email, user._id, 'password-reset');
      } catch (error) {
        if (!(error instanceof HttpError) || error.code !== 'EMAIL_DELIVERY_FAILED') {
          throw error;
        }
      }
    }
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const challenge = await authRepository.findChallenge(input.email, 'password-reset');
    if (!challenge || !(await bcrypt.compare(input.otp, challenge.otpHash))) {
      if (challenge) {
        await authRepository.recordChallengeFailure(challenge._id);
      }
      throw new HttpError(400, 'Invalid or expired verification code', 'INVALID_OTP');
    }
    if (!(await authRepository.consumeChallenge(challenge._id))) {
      throw new HttpError(400, 'Invalid or expired verification code', 'INVALID_OTP');
    }
    await authRepository.updatePassword(
      challenge.userId,
      await hashPassword(input.password),
    );
  },
};