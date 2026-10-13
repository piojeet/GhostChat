import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID')
  .transform(value => value.toLowerCase());

export const createChatBodySchema = z
  .object({ userId: objectIdSchema })
  .strict();

export const chatIdParamsSchema = z.object({ chatId: objectIdSchema });

export const chatListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});