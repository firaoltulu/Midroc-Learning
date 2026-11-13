import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseEmptyBody, parseInput, routeParam } from '../../core/http/validate.js';
import { catalogQuerySchema, courseCreateSchema } from './courses.schemas.js';
import * as service from './courses.service.js';

function uuidParam(req: Request, key: string): string {
  const value = routeParam(req, key);
  if (!isUuid(value)) throw invalidParameter(key);
  return value;
}

export async function catalog(req: Request, res: Response): Promise<void> {
  res.json(await service.listCatalog(req.user, parseInput(catalogQuerySchema, req.query)));
}

export async function categories(_req: Request, res: Response): Promise<void> {
  res.json({ items: await service.listCategories() });
}

export async function detail(req: Request, res: Response): Promise<void> {
  res.json(await service.getCourse(uuidParam(req, 'id'), req.user));
}

export async function mine(req: Request, res: Response): Promise<void> {
  res.json(await service.listMine(req.user));
}

export async function create(req: Request, res: Response): Promise<void> {
  res.status(201).json(await service.createCourse(req.user, parseInput(courseCreateSchema, req.body)));
}

export async function submit(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await service.submitCourse(req.user, uuidParam(req, 'id'));
  res.status(204).end();
}

export async function remove(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await service.deleteCourse(req.user, uuidParam(req, 'id'));
  res.status(204).end();
}
