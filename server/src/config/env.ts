import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().regex(/^\d+[smhd]$/).default('30d'),
  OTP_EXPIRES_MINUTES: z.coerce.number().int().min(1).max(60).default(10),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASSWORD: z.string().min(1),
  SMTP_FROM: z.string().min(1),
  CLIENT_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  FIREBASE_PROJECT_ID: z.string().min(1).optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  STUN_URLS: z.string().default('stun:stun.l.google.com:19302'),
  TURN_URLS: z.string().default(''),
  TURN_SHARED_SECRET: z.string().min(32).optional(),
  CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
  CLOUDINARY_API_KEY: z.string().min(1).optional(),
  CLOUDINARY_API_SECRET: z.string().min(1).optional(),
}).refine(
  values => values.JWT_ACCESS_SECRET !== values.JWT_REFRESH_SECRET,
  {
    path: ['JWT_REFRESH_SECRET'],
    message: 'JWT access and refresh secrets must be different',
  },
).refine(
  values => !values.TURN_URLS.trim() || Boolean(values.TURN_SHARED_SECRET),
  {
    path: ['TURN_SHARED_SECRET'],
    message: 'TURN_SHARED_SECRET is required when TURN_URLS are configured',
  },
).refine(
  values => Boolean(values.FIREBASE_PROJECT_ID) === Boolean(values.GOOGLE_APPLICATION_CREDENTIALS),
  {
    path: ['FIREBASE_PROJECT_ID'],
    message: 'FIREBASE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS must be configured together',
  },
);

const parsedEnv = envSchema.safeParse(process.env);
if (!parsedEnv.success) {
  throw new Error(`Invalid environment configuration: ${parsedEnv.error.message}`);
}

export const env = parsedEnv.data;