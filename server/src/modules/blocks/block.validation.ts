import { z } from 'zod';

export const blockUserParamsSchema = z.object({
  userId: z
    .string()
    .regex(/^[a-f\d]{24}$/i, 'Invalid user ID')
    .transform(value => value.toLowerCase()),
});