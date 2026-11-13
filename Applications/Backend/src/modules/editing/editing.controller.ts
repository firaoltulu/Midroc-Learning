import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { BadRequest } from '../../core/http/app-error.js';
import { parseEmptyBody, parseInput, routeParam } from '../../core/http/validate.js';
import {
  coursePatchSchema,
  courseRevisionPutSchema
} from './editing.schemas.js';
import {
  deleteCourseRevision as deleteCourseRevisionService,
  getCourseRevision as getCourseRevisionService,
  saveCourseRevision as saveCourseRevisionService
} from './editing.revisions.service.js';
import { patchCourse as patchCourseService } from './editing.service.js';

export async function patchCourse(req: Request, res: Response): Promise<void> {
  const courseId = routeParam(req, 'id');
  if (!isUuid(courseId)) throw new BadRequest('Invalid course id');
  res.json(await patchCourseService(req.user, courseId, parseInput(coursePatchSchema, req.body)));
}

export async function courseRevision(req: Request, res: Response): Promise<void> {
  res.json(await getCourseRevisionService(req.user, courseIdParam(req)));
}

export async function saveCourseRevision(req: Request, res: Response): Promise<void> {
  const revision = await saveCourseRevisionService(
    req.user,
    courseIdParam(req),
    parseInput(courseRevisionPutSchema, req.body)
  );
  res.json(revision);
}

export async function deleteCourseRevision(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await deleteCourseRevisionService(req.user, courseIdParam(req));
  res.status(204).end();
}

function courseIdParam(req: Request): string {
  const courseId = routeParam(req, 'courseId');
  if (!isUuid(courseId)) throw new BadRequest('Invalid course id');
  return courseId;
}
