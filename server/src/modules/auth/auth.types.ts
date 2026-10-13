import type { Types } from 'mongoose';

export type RegisterInput = {
  username: string;
  email: string;
  password: string;
  displayName: string;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type OtpInput = {
  email: string;
  otp: string;
};

export type ResetPasswordInput = OtpInput & {
  password: string;
};

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  isEmailVerified: boolean;
  avatar: string | null;
  gender: 'male' | 'female' | null;
};

export type AuthResult = {
  user: PublicUser;
  accessToken: string;
  refreshToken: string;
};

export type UserId = Types.ObjectId | string;