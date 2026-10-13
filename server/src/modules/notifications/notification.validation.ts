import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID')
  .transform(value => value.toLowerCase());

export const notificationIdParamsSchema = z.object({
  notificationId: objectIdSchema,
});

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  category: z.enum(['all', 'snaps', 'stories', 'chats', 'system']).default('all'),
});

export const pushDeviceSchema = z.object({
  token: z.string().trim().min(32).max(4096),
  platform: z.enum(['android', 'ios']),
});