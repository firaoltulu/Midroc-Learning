import type { Request, Response } from 'express';
import { z } from 'zod';
import { parseInput } from '../../core/http/validate.js';
import { paginationSchema } from '../../core/http/pagination.js';
import * as service from './courses.service.js';
import type { CourseStatus } from './courses.types.js';

const querySchema = paginationSchema.extend({
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'archived']).optional(),
  q: z.string().trim().max(200).optional()
}).strict();

export async function courseAdminList(req: Request, res: Response): Promise<void> {
  const input = parseInput(querySchema, req.query);
  const result = await service.listAdminCourses({
    ...(input.status === undefined ? {} : { status: input.status as CourseStatus }),
    ...(input.q === undefined ? {} : { q: input.q }),
    page: input.page,
    pageSize: input.pageSize
  });
  res.json({ ...result, page: input.page, pageSize: input.pageSize });
}
