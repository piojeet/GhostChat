import crypto from 'node:crypto';
import jwt, { type JwtPayload, type SignOptions } from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { env } from '../config/env';
import { HttpError } from './httpError';

export type TokenPurpose = 'access' | 'refresh';

export type AuthTokenPayload = JwtPayload & {
  sub: string;
  purpose: TokenPurpose;
  sessionId?: string;
};

export const createAccessToken = (userId: Types.ObjectId | string): string =>
  jwt.sign(
    { purpose: 'access' },
    env.JWT_ACCESS_SECRET,
    {
      subject: userId.toString(),
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    },
  );

export const createRefreshToken = (
  userId: Types.ObjectId | string,
  sessionId: Types.ObjectId | string,
): string =>
  jwt.sign(
    { purpose: 'refresh', sessionId: sessionId.toString() },
    env.JWT_REFRESH_SECRET,
    {
      subject: userId.toString(),
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    },
  );

const verifyToken = (
  token: string,
  secret: string,
  purpose: TokenPurpose,
): AuthTokenPayload => {
  try {
    const payload = jwt.verify(token, secret);
    if (
      typeof payload === 'string' ||
      payload.purpose !== purpose ||
      typeof payload.sub !== 'string'
    ) {
      throw new Error('Invalid token payload');
    }
    return payload as AuthTokenPayload;
  } catch {
    throw new HttpError(401, 'Invalid or expired token', 'INVALID_TOKEN');
  }
};

export const verifyAccessToken = (token: string): AuthTokenPayload =>
  verifyToken(token, env.JWT_ACCESS_SECRET, 'access');

export const verifyRefreshToken = (token: string): AuthTokenPayload => {
  const payload = verifyToken(token, env.JWT_REFRESH_SECRET, 'refresh');
  if (!payload.sessionId) {
    throw new HttpError(401, 'Invalid refresh token', 'INVALID_TOKEN');
  }
  return payload;
};

export const hashRefreshToken = (token: string): string =>
  crypto.createHash('sha256').update(token).digest('hex');

export const refreshExpiresAt = (): Date => {
  const match = /^(\d+)([smhd])$/.exec(env.JWT_REFRESH_EXPIRES_IN);
  if (!match) {
    throw new Error('JWT_REFRESH_EXPIRES_IN must be a duration such as 30d');
  }
  const value = Number(match[1]);
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return new Date(Date.now() + value * multipliers[match[2]]);
};