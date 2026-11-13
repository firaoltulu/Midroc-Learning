import { z } from 'zod';

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(50).default(20)
  })
  .strict();

export type Pagination = z.infer<typeof paginationSchema>;

export function paginationOffset({ page, pageSize }: Pagination): number {
  return (page - 1) * pageSize;
}
