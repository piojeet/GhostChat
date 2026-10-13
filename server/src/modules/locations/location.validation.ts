import { z } from 'zod';

export const updateLocationSchema = z
  .object({
    latitude: z.number().finite().min(-90).max(90),
    longitude: z.number().finite().min(-180).max(180),
  })
  .strict();

export const updateLocationPreferencesSchema = z
  .object({
    sharingEnabled: z.boolean(),
    ghostMode: z.boolean(),
  })
  .strict();
