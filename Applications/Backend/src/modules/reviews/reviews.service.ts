import type { Actor } from '../../core/actor.js';
import { db } from '../../core/db/pool.js';
import { Conflict, NotFound } from '../../core/http/app-error.js';
import { getCourse } from '../courses/index.js';
import { isEnrolled } from '../enrollments/index.js';
import * as repository from './reviews.repository.js';
import type { ReviewInput } from './reviews.schemas.js';

/** Reviews of a course the viewer may see (published; owners and administrators any). */
export async function listReviews(
  actor: Actor,
  courseId: string,
  input: { page: number; pageSize: number }
) {
  await getCourse(courseId, actor);
  const result = await repository.listForCourse(db, courseId, actor.id, {
    limit: input.pageSize,
    offset: (input.page - 1) * input.pageSize
  });
  return { ...result, page: input.page, pageSize: input.pageSize };
}

/**
 * Rate a course (and optionally comment): enrolled learners of a published course only, one
 * review each (saving again replaces it). Owners don't review their own course.
 */
export async function saveReview(actor: Actor, courseId: string, input: ReviewInput) {
  const course = await getCourse(courseId, actor);
  if (course.ownerId === actor.id) {
    throw new Conflict('Owners cannot review their own course', 'REVIEW_NOT_ALLOWED');
  }
  if (course.status !== 'published') throw new Conflict('Course is not published', 'NOT_PUBLISHED');
  if (!(await isEnrolled(actor.id, courseId))) {
    throw new Conflict('Only enrolled learners can review a course', 'REVIEW_NOT_ALLOWED');
  }
  return repository.upsert(db, courseId, actor.id, input);
}

export async function deleteReview(actor: Actor, courseId: string): Promise<void> {
  if (!(await repository.remove(db, courseId, actor.id))) throw new NotFound('Review not found');
}
