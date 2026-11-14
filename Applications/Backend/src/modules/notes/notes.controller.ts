import type { Request, Response } from 'express';
import { isUuid } from '../../core/ids.js';
import { invalidParameter } from '../../core/http/app-error.js';
import { parseEmptyBody, parseInput, routeParam } from '../../core/http/validate.js';
import { noteCreateSchema, notePatchSchema } from './notes.schemas.js';
import * as service from './notes.service.js';

function uuidParam(req: Request, key: string): string {
  const value = routeParam(req, key);
  if (!isUuid(value)) throw invalidParameter(key);
  return value;
}

export async function list(req: Request, res: Response): Promise<void> {
  res.json(await service.listNotes(req.user, uuidParam(req, 'itemId')));
}

export async function create(req: Request, res: Response): Promise<void> {
  const input = parseInput(noteCreateSchema, req.body);
  res.status(201).json(await service.addNote(req.user, uuidParam(req, 'itemId'), input));
}

export async function update(req: Request, res: Response): Promise<void> {
  const { body } = parseInput(notePatchSchema, req.body);
  res.json(await service.editNote(req.user, uuidParam(req, 'noteId'), body));
}

export async function remove(req: Request, res: Response): Promise<void> {
  parseEmptyBody(req);
  await service.deleteNote(req.user, uuidParam(req, 'noteId'));
  res.status(204).end();
}
