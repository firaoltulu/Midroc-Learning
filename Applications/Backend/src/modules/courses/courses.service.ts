import type { Actor } from '../../core/actor.js';
import { db, type Queryable } from '../../core/db/pool.js';
import { withTx } from '../../core/db/tx.js';
import { Conflict, Forbidden, NotFound, Unprocessable } from '../../core/http/app-error.js';
import { escapeLike } from '../../core/db/sql.js';
import type { CourseCreateInput } from './courses.schemas.js';
import * as repository from './courses.repository.js';
import type { Course } from './courses.types.js';
import type { CourseFields } from './courses.types.js';

export const FIELD_POLICY = {
  // Presentation details apply right away; what the course teaches and promises needs review.
  minor: ['thumbnailUrl', 'tags', 'estimatedDurationMinutes', 'level', 'skills'],
  major: ['title', 'description', 'category', 'language', 'outcomes']
} as const;

export async function createCourse(actor: Actor, input: CourseCreateInput): Promise<Course> {
  return repository.insertCourse(db, actor.id, input);
}

export async function listCatalog(
  actor: Actor,
  input: {
    q?: string | undefined;
    category?: string | undefined;
    language?: string | undefined;
    sort: 'newest' | 'popular';
    page: number;
    pageSize: number;
  }
) {
  const q = input.q === undefined ? undefined : escapeLike(input.q);
  const result = await repository.listCatalog(db, actor.id, {
    ...(q === undefined ? {} : { q }),
    ...(input.category === undefined ? {} : { category: input.category }),
    ...(input.language === undefined ? {} : { language: input.language }),
    sort: input.sort,
    limit: input.pageSize,
    offset: (input.page - 1) * input.pageSize
  });
  return { ...result, page: input.page, pageSize: input.pageSize };
}

/** The catalog for signed-out visitors (the guest home page): published courses only. */
export async function listPublicCatalog(input: {
  category?: string | undefined;
  language?: string | undefined;
  sort: 'newest' | 'popular';
  page: number;
  pageSize: number;
}) {
  const result = await repository.listPublicCatalog(db, {
    ...(input.category === undefined ? {} : { category: input.category }),
    ...(input.language === undefined ? {} : { language: input.language }),
    sort: input.sort,
    limit: input.pageSize,
    offset: (input.page - 1) * input.pageSize
  });
  return { ...result, page: input.page, pageSize: input.pageSize };
}

export async function listCategories(): Promise<Array<{ name: string; courseCount: number }>> {
  return repository.listCategories(db);
}

export async function getCourse(id: string, actor: Actor): Promise<repository.CourseDetail> {
  const course = await repository.findById(db, id);
  if (!course) throw new NotFound('Course not found');
  const canManage = course.ownerId === actor.id || actor.role === 'admin';
  if (course.status !== 'published' && !canManage) {
    throw new NotFound('Course not found');
  }
  const detail = await repository.getDetail(db, id, { id: actor.id, canManage });
  if (detail === undefined) throw new NotFound('Course not found');
  return detail;
}

export async function listMine(actor: Actor): Promise<repository.OwnedCourse[]> {
  return repository.listMine(db, actor.id);
}

export async function submitCourse(actor: Actor, id: string): Promise<void> {
  await withTx(async (tx) => {
    const course = await repository.findById(tx, id, true);
    if (!course || course.ownerId !== actor.id) {
      throw new NotFound('Course not found');
    }
    if (course.status === 'pending_review') {
      throw new Conflict('Course is locked', 'LOCKED');
    }
    if (!['draft', 'rejected'].includes(course.status)) {
      throw new Conflict('Course cannot be submitted in its current state', 'LOCKED');
    }
    const problems = [
      ...(course.description.trim() ? [] : ['DESCRIPTION_REQUIRED' as const]),
      ...(await repository.courseReadinessProblems(tx, id))
    ];
    if (problems.length) {
      throw new Unprocessable('Course is incomplete', 'COURSE_INCOMPLETE', { problems });
    }
    await repository.submitCourse(tx, id);
  });
}

export async function deleteCourse(actor: Actor, id: string): Promise<void> {
  await withTx(async (tx) => {
    const course = await repository.findById(tx, id, true);
    if (!course || (course.ownerId !== actor.id && actor.role !== 'admin')) {
      throw new NotFound('Course not found');
    }
    const enrolled = await repository.hasEnrollments(tx, id);
    if (course.status === 'published' || course.status === 'archived' || enrolled) {
      await repository.archive(tx, id);
    } else {
      await repository.hardDelete(tx, id);
    }
  });
}

export async function resolveCourseContext(
  queryable: Queryable,
  kind: 'course' | 'module' | 'item',
  id: string,
  actor: Actor,
  options: { lock?: boolean } = {}
): Promise<{ id: string; ownerId: string; status: Course['status'] }> {
  const course = await repository.resolveContext(queryable, kind, id, options.lock ?? false);
  if (!course || (course.ownerId !== actor.id && actor.role !== 'admin')) {
    throw new NotFound('Course not found');
  }
  return course;
}

export async function assertOwnerOrAdmin(course: Course, actor: Actor): Promise<void> {
  if (course.ownerId !== actor.id && actor.role !== 'admin') throw new Forbidden();
}

export async function getCourseForUpdate(queryable: Queryable, id: string): Promise<Course | undefined> {
  return repository.findById(queryable, id, true);
}

export async function applyFields(
  queryable: Queryable,
  id: string,
  fields: CourseFields
): Promise<Course> {
  const course = await repository.updateFields(queryable, id, fields);
  if (!course) throw new NotFound('Course not found');
  return course;
}

export async function listAdminCourses(input: {
  status?: Course['status'] | undefined;
  q?: string | undefined;
  page: number;
  pageSize: number;
}) {
  return repository.listAdminCourses(db, {
    ...(input.status === undefined ? {} : { status: input.status }),
    ...(input.q === undefined ? {} : { q: escapeLike(input.q) }),
    limit: input.pageSize,
    offset: (input.page - 1) * input.pageSize
  });
}

export async function listPendingCourses() {
  return repository.pendingCourses(db);
}

export async function reviewCourse(
  reviewer: Actor,
  id: string,
  decision: 'published' | 'rejected',
  reason?: string
): Promise<void> {
  await withTx(async (tx) => {
    const course = await repository.findById(tx, id, true);
    if (!course) throw new NotFound('Course not found');
    if (course.status !== 'pending_review') {
      throw new Conflict('Course is not pending review', 'LOCKED');
    }
    await repository.reviewCourse(tx, id, reviewer.id, decision, reason);
  });
}
