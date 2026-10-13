import { z } from 'zod';

const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const password = z
  .string()
  .min(8)
  .max(72)
  .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[a-z]/, 'Password must contain a lowercase letter')
  .regex(/\d/, 'Password must contain a number')
  .regex(/[^A-Za-z0-9]/, 'Password must contain a special character');

export const registerSchema = z.object({
  username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/)
    .transform(value => value.toLowerCase()),
  email,
  password,
  displayName: z.string().trim().min(1).max(80),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72)
    .refine(value => Buffer.byteLength(value, 'utf8') <= 72, 'Password must not exceed 72 UTF-8 bytes'),
});

export const emailSchema = z.object({ email });
export const resendOtpSchema = emailSchema.extend({
  purpose: z.enum(['registration', 'password-reset']),
});

export const otpSchema = z.object({
  email,
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit code'),
});
export const verifyOtpSchema = otpSchema.extend({
  purpose: z.enum(['registration', 'password-reset']).optional(),
});

export const resetPasswordSchema = otpSchema.extend({ password });

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});