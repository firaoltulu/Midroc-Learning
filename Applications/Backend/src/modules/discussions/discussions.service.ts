import type { Actor } from '../../core/actor.js';
import { db } from '../../core/db/pool.js';
import { Conflict, Forbidden, NotFound } from '../../core/http/app-error.js';
import { itemAccess } from '../content/index.js';
import * as repository from './discussions.repository.js';

/**
 * Discussions on a course item. Everyone who may open the item (enrolled learners, the course
 * owner, administrators) reads them; posting needs a published course. A post is deleted by
 * its author, the course owner or an administrator (a thread takes its replies with it).
 */

function assertOpen(status: string): void {
  if (status !== 'published') throw new Conflict('Course is not published', 'NOT_PUBLISHED');
}

export async function listThreads(
  actor: Actor,
  itemId: string,
  input: { page: number; pageSize: number }
) {
  const access = await itemAccess(itemId, actor);
  const result = await repository.listThreads(
    db,
    itemId,
    { viewerId: actor.id, ownerId: access.ownerId },
    { limit: input.pageSize, offset: (input.page - 1) * input.pageSize }
  );
  return { ...result, page: input.page, pageSize: input.pageSize };
}

export async function startThread(actor: Actor, itemId: string, body: string) {
  const access = await itemAccess(itemId, actor);
  assertOpen(access.status);
  const post = await repository.insertPost(
    db,
    { itemId, userId: actor.id, parentId: null, body },
    access.ownerId
  );
  return { ...post, replyCount: 0 };
}

/** A thread (not a reply) the viewer may read, with its item's access. */
async function readableThread(actor: Actor, postId: string) {
  const post = await repository.findPost(db, postId);
  if (!post || post.parentId !== null) throw new NotFound('Discussion not found');
  const access = await itemAccess(post.itemId, actor);
  return { post, access };
}

export async function listReplies(actor: Actor, postId: string) {
  const { access } = await readableThread(actor, postId);
  return repository.listReplies(db, postId, { viewerId: actor.id, ownerId: access.ownerId });
}

export async function reply(actor: Actor, postId: string, body: string) {
  const { post, access } = await readableThread(actor, postId);
  assertOpen(access.status);
  return repository.insertPost(
    db,
    { itemId: post.itemId, userId: actor.id, parentId: post.id, body },
    access.ownerId
  );
}

export async function deletePost(actor: Actor, postId: string): Promise<void> {
  const post = await repository.findPost(db, postId);
  if (!post) throw new NotFound('Discussion not found');
  const access = await itemAccess(post.itemId, actor);
  const allowed =
    post.userId === actor.id || access.ownerId === actor.id || actor.role === 'admin';
  if (!allowed) throw new Forbidden('Only the author, the course owner or an administrator can delete this');
  await repository.deletePost(db, postId);
}
