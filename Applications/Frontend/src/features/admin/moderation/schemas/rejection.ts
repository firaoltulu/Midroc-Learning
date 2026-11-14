import { z } from 'zod';

/** Rejection in openapi.yaml: reason 1–4000 characters (trimmed). */
export const REASON_MAX = 4000;

export const rejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(1, 'admin:reject.errors.required')
    .max(REASON_MAX, 'admin:reject.errors.tooLong'),
});

export type RejectionValues = z.infer<typeof rejectionSchema>;
