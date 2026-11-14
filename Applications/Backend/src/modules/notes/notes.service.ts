import type { Actor } from '../../core/actor.js';
import { db } from '../../core/db/pool.js';
import { NotFound } from '../../core/http/app-error.js';
import { itemAccess } from '../content/index.js';
import * as repository from './notes.repository.js';

/** Private notes on a course item: only their author ever sees or changes them. */

export async function listNotes(actor: Actor, itemId: string) {
  await itemAccess(itemId, actor);
  return repository.listMine(db, actor.id, itemId);
}

export async function addNote(
  actor: Actor,
  itemId: string,
  input: { body: string; positionSeconds: number | null }
) {
  await itemAccess(itemId, actor);
  return repository.insert(db, { userId: actor.id, itemId, ...input });
}

export async function editNote(actor: Actor, noteId: string, body: string) {
  const note = await repository.updateMine(db, actor.id, noteId, body);
  if (!note) throw new NotFound('Note not found');
  return note;
}

export async function deleteNote(actor: Actor, noteId: string): Promise<void> {
  if (!(await repository.deleteMine(db, actor.id, noteId))) throw new NotFound('Note not found');
}
