import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseEmptyBody, routeParam } from '../../core/http/validate.js';
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
