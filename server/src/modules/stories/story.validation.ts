import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID')
  .transform(value => value.toLowerCase());

export const storyIdParamsSchema = z.object({ storyId: objectIdSchema });
export const userIdParamsSchema = z.object({ userId: objectIdSchema });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const viewersPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export const createStoryFieldsSchema = z
  .object({
    mediaType: z.enum(['image', 'video']),
    caption: z.string().trim().max(500).optional().default(''),
    visibility: z.enum(['public', 'friends']).optional().default('friends'),
  })
  .strict();