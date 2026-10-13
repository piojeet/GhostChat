import { z } from 'zod';

const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, 'Invalid ID')
  .transform(value => value.toLowerCase());

export const messageIdParamsSchema = z.object({
  chatId: objectIdSchema,
  messageId: objectIdSchema,
});

export const sendMessageBodySchema = z
  .object({
    text: z.string().trim().min(1).max(5000),
    replyToId: objectIdSchema.optional(),
  })
  .strict();

export const sendMessageMediaBodySchema = z
  .object({
    mediaType: z.enum(['image', 'voice']),
    durationSeconds: z.coerce.number().int().min(1).max(3600).optional(),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.mediaType === 'voice' && input.durationSeconds === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['durationSeconds'],
        message: 'Voice messages must include their duration',
      });
    }
    if (input.mediaType === 'image' && input.durationSeconds !== undefined) {
      context.addIssue({
        code: 'custom',
        path: ['durationSeconds'],
        message: 'Images cannot include an audio duration',
      });
    }
  });

export const messagesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});