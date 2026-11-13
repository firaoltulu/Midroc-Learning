import { z } from 'zod';

export const rejectionSchema = z
  .object({ reason: z.string().trim().min(1).max(4000) })
  .strict();
