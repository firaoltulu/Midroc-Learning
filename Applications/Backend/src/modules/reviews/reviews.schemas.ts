import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const reviewInputSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(2000).default('')
  })
  .strict();

export const reviewListQuerySchema = paginationSchema;

export type ReviewInput = z.infer<typeof reviewInputSchema>;
