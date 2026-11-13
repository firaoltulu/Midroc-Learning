import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { BadRequest } from '../../core/http/app-error.js';
import { parseEmptyBody, parseInput, routeParam } from '../../core/http/validate.js';
import * as service from './content.authoring.service.js';
import {
  itemCreateSchema,
  itemOrderSchema,
  itemPatchSchema,
  moduleCreateSchema,
  moduleOrderSchema,
  modulePatchSchema,
  questionsBodySchema
} from './content.schemas.js';

function uuidParam(req: Request, key: string): string {
  const value = routeParam(req, key);
  if (!isUuid(value)) throw new BadRequest(`Invalid ${key}`);
  return value;
}

export async function authoring(req: Request, res: Response): Promise<void> {
  res.json(await service.authoringTree(uuidParam(req, 'courseId'), req.user));
}

export async function createModule(req: Request, res: Response): Promise<void> {
  res.status(201).json(
    await service.createModule(req.user, uuidParam(req, 'courseId'), parseInput(moduleCreateSchema, req.body))
  );
}

export async function patchModule(req: Request, res: Response): Promise<void> {
  await service.patchModule(req.user, uuidParam(req, 'moduleId'), parseInput(modulePatchSchema, req.body));
  res.status(204).end();
}

export async function deleteModule(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await service.deleteModule(req.user, uuidParam(req, 'moduleId'));
  res.status(204).end();
}

export async function reorderModules(req: Request, res: Response): Promise<void> {
  const { moduleIds } = parseInput(moduleOrderSchema, req.body);
  await service.reorderModules(req.user, uuidParam(req, 'courseId'), moduleIds);
  res.status(204).end();
}

export async function createItem(req: Request, res: Response): Promise<void> {
  res.status(201).json(
    await service.createItem(req.user, uuidParam(req, 'moduleId'), parseInput(itemCreateSchema, req.body))
  );
}

export async function patchItem(req: Request, res: Response): Promise<void> {
  await service.patchItem(req.user, uuidParam(req, 'itemId'), parseInput(itemPatchSchema, req.body));
  res.status(204).end();
}

export async function deleteItem(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await service.deleteItem(req.user, uuidParam(req, 'itemId'));
  res.status(204).end();
}

export async function reorderItems(req: Request, res: Response): Promise<void> {
  const { itemIds } = parseInput(itemOrderSchema, req.body);
  await service.reorderItems(req.user, uuidParam(req, 'moduleId'), itemIds);
  res.status(204).end();
}

export async function replaceQuestions(req: Request, res: Response): Promise<void> {
  const { questions } = parseInput(questionsBodySchema, req.body);
  await service.replaceExamQuestions(req.user, uuidParam(req, 'itemId'), questions);
  res.status(204).end();
}
