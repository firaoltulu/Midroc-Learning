import type { Request } from 'express';
import type { ZodType } from 'zod';
import { z } from 'zod';
import { BadRequest } from './app-error.js';

export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  return schema.parse(input);
}

export function parseEmptyBody(req: Request): void {
  if (req.body !== undefined) parseInput(z.object({}).strict(), req.body);
}

export function routeParam(req: Request, key: string): string {
  const value = req.params[key];
  if (typeof value !== 'string') throw new BadRequest(`Invalid ${key}`);
  return value;
}
