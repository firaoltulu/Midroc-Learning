import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseEmptyBody, parseInput, routeParam } from '../../core/http/validate.js';
import { postInputSchema, threadListQuerySchema } from './discussions.schemas.js';
import * as service from './discussions.service.js';

function uuidParam(req: Request, key: string): string {
  const value = routeParam(req, key);
  if (!isUuid(value)) throw invalidParameter(key);
  return value;
}

export async function threads(req: Request, res: Response): Promise<void> {
  const input = parseInput(threadListQuerySchema, req.query);
  res.json(await service.listThreads(req.user, uuidParam(req, 'itemId'), input));
}

export async function startThread(req: Request, res: Response): Promise<void> {
  const { body } = parseInput(postInputSchema, req.body);
  res.status(201).json(await service.startThread(req.user, uuidParam(req, 'itemId'), body));
}

export async function replies(req: Request, res: Response): Promise<void> {
  res.json(await service.listReplies(req.user, uuidParam(req, 'postId')));
}

export async function reply(req: Request, res: Response): Promise<void> {
  const { body } = parseInput(postInputSchema, req.body);
  res.status(201).json(await service.reply(req.user, uuidParam(req, 'postId'), body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await service.deletePost(req.user, uuidParam(req, 'postId'));
  res.status(204).end();
}
