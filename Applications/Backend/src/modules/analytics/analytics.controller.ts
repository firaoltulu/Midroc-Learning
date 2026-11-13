import type { Request, Response } from 'express';
import { z } from 'zod';
import { isUuid } from '../../core/ids.js';
import { BadRequest } from '../../core/http/app-error.js';
import { parseInput, routeParam } from '../../core/http/validate.js';
import * as service from './analytics.service.js';

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
});

const seriesSchema = z
  .object({
    from: date,
    to: date,
    interval: z.enum(['day', 'week', 'month']).default('day'),
    courseId: z.string().optional()
  })
  .strict();

export async function overview(_req: Request, res: Response): Promise<void> {
  res.json(await service.overview());
}

export async function enrollments(req: Request, res: Response): Promise<void> {
  const input = parseInput(seriesSchema, req.query);
  if (input.courseId !== undefined && !isUuid(input.courseId)) {
    throw new BadRequest('Invalid courseId');
  }
  res.json(await service.enrollmentSeries(input));
}

export async function courses(_req: Request, res: Response): Promise<void> {
  res.json(await service.topCourses());
}

export async function course(req: Request, res: Response): Promise<void> {
  const id = routeParam(req, 'courseId');
  if (!isUuid(id)) throw new BadRequest('Invalid courseId');
  res.json(await service.courseDetail(id));
}
