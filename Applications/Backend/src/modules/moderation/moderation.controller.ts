import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseEmptyBody, parseInput, routeParam } from '../../core/http/validate.js';
import { listPendingCourses, reviewCourse } from '../courses/index.js';
import {
  approveCourseRevision,
  getRevisionDiff,
  listPendingCourseRevisions,
  rejectCourseRevision
} from '../editing/index.js';
import { rejectionSchema } from './moderation.schemas.js';

function courseId(req: Request): string {
  const id = routeParam(req, 'id');
  if (!isUuid(id)) throw invalidParameter('courseId');
  return id;
}

function revisionId(req: Request): string {
  const id = routeParam(req, 'id');
  if (!isUuid(id)) throw invalidParameter('revisionId');
  return id;
}

export async function queue(_req: Request, res: Response): Promise<void> {
  const [courses, revisions] = await Promise.all([
    listPendingCourses(),
    listPendingCourseRevisions()
  ]);
  res.json({ courses, revisions });
}

export async function approve(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await reviewCourse(req.user, courseId(req), 'published');
  res.status(204).end();
}

export async function reject(req: Request, res: Response): Promise<void> {
  const { reason } = parseInput(rejectionSchema, req.body);
  await reviewCourse(req.user, courseId(req), 'rejected', reason);
  res.status(204).end();
}

export async function revisionDiff(req: Request, res: Response): Promise<void> {
  res.json(await getRevisionDiff(revisionId(req), req.user));
}

export async function approveRevision(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await approveCourseRevision(req.user, revisionId(req));
  res.status(204).end();
}

export async function rejectRevision(req: Request, res: Response): Promise<void> {
  const { reason } = parseInput(rejectionSchema, req.body);
  await rejectCourseRevision(req.user, revisionId(req), reason);
  res.status(204).end();
}
