import type { Actor } from '../../core/actor.js';
import { withTx } from '../../core/db/tx.js';
import { Conflict } from '../../core/http/app-error.js';
import { applyFields, FIELD_POLICY, resolveCourseContext } from '../courses/index.js';
import type { CourseFields } from '../courses/index.js';

export async function patchCourse(
  actor: Actor,
  courseId: string,
  fields: CourseFields
) {
  return withTx(async (tx) => {
    const course = await resolveCourseContext(tx, 'course', courseId, actor, { lock: true });
    if (course.status === 'pending_review' || course.status === 'archived') {
      throw new Conflict('Course is locked', 'LOCKED');
    }
    if (course.status === 'published' && actor.role !== 'admin') {
      const majorFields = new Set<string>(FIELD_POLICY.major);
      if (Object.keys(fields).some((field) => majorFields.has(field))) {
        throw new Conflict('Major changes require a revision', 'REVISION_REQUIRED');
      }
    }
    return applyFields(tx, courseId, fields);
  });
}
