import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid user ID')
  .transform(value => value.toLowerCase());

export const friendRequestBodySchema = z
  .object({ userId: objectIdSchema })
  .strict();

export const userIdParamsSchema = z.object({ userId: objectIdSchema });

export const requestIdParamsSchema = z.object({ requestId: objectIdSchema });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1).max(50),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});