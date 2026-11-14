import type { CourseDetail } from '../api/schemas';

/**
 * The course page's main action (spec section 7):
 * - the owner edits the course;
 * - an enrolled learner continues at the first incomplete item (or reviews from the start
 *   once everything is done);
 * - anyone else enrolls in a published course;
 * - nothing for a course that can't be taken (e.g. an administrator viewing a draft).
 * Unenrolling is a separate, quiet action for enrolled learners.
 */
export type CourseAction =
  | { kind: 'edit' }
  | { kind: 'continue'; itemId: string }
  | { kind: 'review'; itemId: string }
  | { kind: 'enroll' }
  | { kind: 'none' };

export interface CourseProgress {
  completed: number;
  total: number;
}

const itemsInOrder = (course: CourseDetail) =>
  course.modules.flatMap((module) => module.items.map((item) => item.id));

export function courseProgress(course: CourseDetail): CourseProgress {
  const items = itemsInOrder(course);
  const done = new Set(course.completedItemIds);
  return { completed: items.filter((id) => done.has(id)).length, total: items.length };
}

/** Where a learner picks up: the first item not completed yet (undefined when all are done). */
export function nextItemId(course: CourseDetail): string | undefined {
  const done = new Set(course.completedItemIds);
  return itemsInOrder(course).find((id) => !done.has(id));
}

export function courseAction(course: CourseDetail, viewerId: string): CourseAction {
  if (course.ownerId === viewerId) return { kind: 'edit' };
  if (course.enrolled) {
    const items = itemsInOrder(course);
    const done = new Set(course.completedItemIds);
    const next = items.find((id) => !done.has(id));
    if (next) return { kind: 'continue', itemId: next };
    if (items[0]) return { kind: 'review', itemId: items[0] };
    return { kind: 'none' };
  }
  if (course.status === 'published') return { kind: 'enroll' };
  return { kind: 'none' };
}

export const canUnenroll = (course: CourseDetail, viewerId: string) =>
  course.enrolled && course.ownerId !== viewerId;
