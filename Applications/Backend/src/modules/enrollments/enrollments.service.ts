import type { Actor } from '../../core/actor.js';
import { db } from '../../core/db/pool.js';
import type { Queryable } from '../../core/db/pool.js';
import { withTx } from '../../core/db/tx.js';
import { Conflict, NotFound } from '../../core/http/app-error.js';
import { coursesApi } from '../courses/index.js';
import * as repository from './enrollments.repository.js';

export async function enroll(actor: Actor, courseId: string): Promise<boolean> {
  return withTx(async (tx) => {
    const course = await coursesApi.getCourseForUpdate(tx, courseId);
    if (!course) throw new NotFound('Course not found');
    if (course.ownerId === actor.id) throw new Conflict('Owners cannot enroll in their own course');
    if (course.status === 'pending_review' || course.status === 'archived') {
      throw new Conflict('Course is locked', 'LOCKED');
    }
    if (course.status !== 'published') throw new Conflict('Course is not published', 'NOT_PUBLISHED');
    return repository.insertEnrollment(tx, actor.id, courseId);
  });
}

export async function unenroll(actor: Actor, courseId: string): Promise<void> {
  await repository.deleteEnrollment(db, actor.id, courseId);
}

export async function isEnrolled(userId: string, courseId: string): Promise<boolean> {
  return repository.isEnrolled(db, userId, courseId);
}

export async function listMine(actor: Actor): Promise<unknown[]> {
  return repository.listForUser(db, actor.id);
}

export async function saveProgress(
  actor: Actor,
  itemId: string,
  input: { lastPositionSeconds?: number | undefined; completed?: boolean | undefined }
): Promise<void> {
  if (!(await repository.canUpdateProgress(db, actor.id, itemId))) {
    throw new NotFound('Item not found');
  }
  const updated = await repository.updateProgress(db, actor.id, itemId, input);
  if (!updated) throw new Conflict('Exams are completed by passing an attempt');
}

export async function markItemComplete(
  queryable: Queryable,
  userId: string,
  itemId: string
): Promise<void> {
  await repository.markComplete(queryable, userId, itemId);
}
