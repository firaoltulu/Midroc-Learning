import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const postInputSchema = z
  .object({ body: z.string().trim().min(1).max(4000) })
  .strict();

export const threadListQuerySchema = paginationSchema;

export type PostInput = z.infer<typeof postInputSchema>;
