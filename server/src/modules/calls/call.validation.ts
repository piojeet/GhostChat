import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i).transform(id => id.toLowerCase());

export const callIdParamsSchema = z.object({ callId: objectIdSchema });

export const startCallBodySchema = z
  .object({
    recipientId: objectIdSchema,
    kind: z.enum(['audio', 'video']),
  })
  .strict();

export const callHistoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const callIdPayloadSchema = z
  .object({ callId: objectIdSchema })
  .strict();

export const callFailedPayloadSchema = z
  .object({
    callId: objectIdSchema,
    code: z.string().min(1).max(80).optional(),
    message: z.string().max(500).optional(),
  })
  .strict();

export const outgoingCallPayloadSchema = z
  .object({
    recipientId: objectIdSchema,
    kind: z.enum(['audio', 'video']),
  })
  .strict();

export const signalPayloadSchema = z
  .object({
    callId: objectIdSchema,
    sdp: z.string().min(1).max(256_000),
  })
  .strict();

export const iceCandidatePayloadSchema = z
  .object({
    callId: objectIdSchema,
    candidate: z.object({
      candidate: z.string().min(1).max(4_096),
      sdpMid: z.string().max(256).nullable().optional(),
      sdpMLineIndex: z.number().int().min(0).max(255).nullable().optional(),
      usernameFragment: z.string().max(256).nullable().optional(),
    }).strict(),
  })
  .strict();