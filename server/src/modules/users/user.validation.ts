import { z } from 'zod';

const usernameSchema = z
  .string()
  .trim()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9_.]+$/, 'Username may contain letters, numbers, underscores, and dots')
  .transform(value => value.toLowerCase());

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1).max(80).optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(160).optional(),
    gender: z.enum(['male', 'female']).nullable().optional(),
  })
  .strict()
  .refine(value => Object.keys(value).length > 0, {
    message: 'Provide at least one profile field to update',
  });

export const usernameParamsSchema = z.object({
  username: usernameSchema,
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});