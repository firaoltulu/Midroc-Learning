import type { Request, Response } from 'express';
import { z } from 'zod';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseInput, routeParam } from '../../core/http/validate.js';
import * as service from './exams.service.js';
import { submitSchema } from './exams.schemas.js';

function uuidParam(req: Request, key: string): string {
  const value = routeParam(req, key);
  if (!isUuid(value)) throw invalidParameter(key);
  return value;
}

function validateEmptyBody(req: Request): void {
  if (req.body !== undefined) parseInput(z.object({}).strict(), req.body);
}

export async function getExam(req: Request, res: Response): Promise<void> {
  res.json(await service.getExam(uuidParam(req, 'examId'), req.user));
}

export async function start(req: Request, res: Response): Promise<void> {
  validateEmptyBody(req);
  res.status(201).json(await service.startAttempt(uuidParam(req, 'examId'), req.user));
}

export async function submit(req: Request, res: Response): Promise<void> {
  const { answers } = parseInput(submitSchema, req.body);
  res.json(await service.submitAttempt(uuidParam(req, 'attemptId'), req.user, answers));
}

export async function history(req: Request, res: Response): Promise<void> {
  res.json(await service.listAttempts(uuidParam(req, 'examId'), req.user));
}
