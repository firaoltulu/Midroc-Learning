import { z } from 'zod';

export const progressSchema = z
  .object({
    lastPositionSeconds: z.number().int().min(0).optional(),
    completed: z.boolean().optional()
  })
  .strict()
  .refine(
    (value) => value.lastPositionSeconds !== undefined || value.completed !== undefined,
    'At least one progress field is required'
  );
