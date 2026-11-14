import type { Request, Response } from 'express';
import { z } from 'zod';
import { paginationSchema } from '../../core/http/pagination.js';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseEmptyBody, parseInput, routeParam } from '../../core/http/validate.js';
import * as service from './enrollments.service.js';

function courseId(req: Request): string {
  const id = routeParam(req, 'id');
  if (!isUuid(id)) throw invalidParameter('courseId');
  return id;
}

export async function enroll(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  const created = await service.enroll(req.user, courseId(req));
  res.status(created ? 201 : 200).json({ enrolled: true });
}

export async function unenroll(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await service.unenroll(req.user, courseId(req));
  res.status(204).end();
}

export async function mine(req: Request, res: Response): Promise<void> {
  res.json(await service.listMine(req.user));
}

const courseEnrollmentsQuery = paginationSchema
  .extend({ q: z.string().trim().min(1).max(200).optional() })
  .strict();

export async function courseEnrollments(req: Request, res: Response): Promise<void> {
  const input = parseInput(courseEnrollmentsQuery, req.query);
  res.json(await service.listCourseEnrollments(courseId(req), input));
}

export async function removeCourseEnrollment(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  const userId = routeParam(req, 'userId');
  if (!isUuid(userId)) throw invalidParameter('userId');
  await service.removeCourseEnrollment(courseId(req), userId);
  res.status(204).end();
}
