import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID')
  .transform(value => value.toLowerCase());

export const snapIdParamsSchema = z.object({ snapId: objectIdSchema });

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createSnapFieldsSchema = z
  .object({
    recipients: z
      .array(objectIdSchema)
      .min(1)
      .max(50)
      .refine(values => new Set(values).size === values.length, {
        message: 'Duplicate snap recipients are not allowed',
      }),
    mediaType: z.enum(['image', 'video']),
    caption: z.string().trim().max(500).optional().default(''),
  })
  .strict();

export const parseRecipients = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
};