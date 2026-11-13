import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';

export const usersQuerySchema = paginationSchema.extend({
  q: z.string().trim().max(200).optional(),
  role: z.enum(['user', 'admin']).optional(),
  status: z.enum(['active', 'suspended']).optional()
}).strict();

export const roleSchema = z.object({ role: z.enum(['user', 'admin']) }).strict();
export const statusSchema = z.object({ status: z.enum(['active', 'suspended']) }).strict();
