import type { Actor } from '../../core/actor.js';
import type { Queryable } from '../../core/db/pool.js';
import { db } from '../../core/db/pool.js';
import { withTx } from '../../core/db/tx.js';
import { BadRequest, Conflict, NotFound } from '../../core/http/app-error.js';
import {
  applyFields,
  getCourseForUpdate,
  resolveCourseContext
} from '../courses/index.js';
import type { Course, CourseFields } from '../courses/index.js';
import {
  authoringTree,
  captureRevisionBase,
  prepareRevisionTree,
  validateAndApplyRevisionTree,
  validateRevisionIds
} from '../content/index.js';
import type { courseRevisionPutSchema } from './editing.schemas.js';
import * as repository from './editing.revisions.repository.js';
import { summarizeRevision, type ModuleLike, type RevisionChange } from './revision-summary.js';
import type { z } from 'zod';

type RevisionInput = z.infer<typeof courseRevisionPutSchema>;

function assertPublished(status: string): void {
  if (status !== 'published') throw new Conflict('Only published courses can have revisions', 'LOCKED');
}

function revisionCourse(course: Course): Pick<Course, 'title' | 'description' | 'category' | 'language'> {
  return {
    title: course.title,
    description: course.description,
    category: course.category,
    language: course.language
  };
}

function decisionSummary(revision: repository.CourseRevision | undefined) {
  if (!revision) return null;
  return {
    id: revision.id,
    status: revision.status,
    reason: revision.rejectionReason,
    reviewedBy: revision.reviewedBy,
    reviewedAt: revision.reviewedAt
  };
}

export async function getCourseRevision(actor: Actor, courseId: string) {
  await resolveCourseContext(db, 'course', courseId, actor);
  const [revision, latest] = await Promise.all([
    repository.pendingForCourse(db, courseId),
    repository.latestDecision(db, courseId)
  ]);
  return { revision: revision ?? null, lastDecision: decisionSummary(latest) };
}

export type SaveRevisionResult =
  | { saved: true; unchanged: false; revision: repository.CourseRevision; changes: RevisionChange[] }
  | { saved: false; unchanged: true; revision: null; changes: [] };

/**
 * Merges the input into the course's pending revision and returns the revision with a summary
 * of all its changes against the live course. When the result would change nothing, nothing is
 * saved and any pending revision is withdrawn (`unchanged: true`).
 */
export async function saveCourseRevision(
  actor: Actor,
  courseId: string,
  input: RevisionInput
): Promise<SaveRevisionResult> {
  const context = await resolveCourseContext(db, 'course', courseId, actor);
  assertPublished(context.status);

  const preparedTree = input.modules === undefined
    ? undefined
    : await prepareRevisionTree({ modules: input.modules });
  const live = await authoringTree(courseId, actor);

  return withTx(async (tx) => {
    const lockedContext = await resolveCourseContext(tx, 'course', courseId, actor, { lock: true });
    assertPublished(lockedContext.status);
    const course = await getCourseForUpdate(tx, courseId);
    if (!course) throw new NotFound('Course not found');
    const pending = await repository.pendingForCourse(tx, courseId, true);
    const data: repository.RevisionData = {
      course: { ...(pending?.data.course ?? {}) },
      ...(pending?.data.modules === undefined ? {} : { modules: pending.data.modules }),
      ...(pending?.data.base === undefined ? {} : { base: pending.data.base })
    };

    if (input.course) {
      const current = revisionCourse(course);
      for (const [key, value] of Object.entries(input.course)) {
        if (value === undefined) continue;
        if (value === current[key as keyof typeof current]) delete data.course[key];
        else data.course[key] = value;
      }
    }

    if (preparedTree) {
      try {
        await validateRevisionIds(tx, courseId, preparedTree);
      } catch {
        throw new BadRequest('Revision contains an unknown content reference', 'INVALID_CONTENT_REFERENCE');
      }
      data.modules = preparedTree.modules;
      data.base ??= await captureRevisionBase(tx, courseId);
    }

    const changes = summarizeRevision({
      courseTitle: course.title,
      courseChanges: data.course,
      live: live.modules as ModuleLike[],
      proposed: data.modules as ModuleLike[] | undefined
    });
    if (changes.length === 0) {
      if (pending) await repository.deletePendingRevision(tx, pending.id);
      return { saved: false, unchanged: true, revision: null, changes: [] } as const;
    }
    const revision = await repository.savePendingRevision(tx, courseId, actor.id, data);
    return { saved: true, unchanged: false, revision, changes } as const;
  });
}

export async function deleteCourseRevision(actor: Actor, courseId: string): Promise<void> {
  await withTx(async (tx) => {
    const context = await resolveCourseContext(tx, 'course', courseId, actor, { lock: true });
    assertPublished(context.status);
    const pending = await repository.pendingForCourse(tx, courseId, true);
    if (!pending) throw new NotFound('Pending course revision not found');
    await repository.deletePendingRevision(tx, pending.id);
  });
}

async function lockPendingRevision(tx: Queryable, revisionId: string) {
  const courseId = await repository.revisionCourseId(tx, revisionId);
  if (!courseId) throw new NotFound('Course revision not found');
  const course = await getCourseForUpdate(tx, courseId);
  if (!course) throw new NotFound('Course not found');
  assertPublished(course.status);
  const revision = await repository.findRevision(tx, revisionId, true);
  if (!revision || revision.courseId !== courseId) throw new NotFound('Course revision not found');
  if (revision.status !== 'pending') throw new Conflict('Course revision is not pending', 'ALREADY_DECIDED');
  return { course, revision };
}

export async function approveCourseRevision(reviewer: Actor, revisionId: string): Promise<void> {
  await withTx(async (tx) => {
    const { course, revision } = await lockPendingRevision(tx, revisionId);
    if (revision.data.modules) {
      if (!revision.data.base) throw new Conflict('Revision content snapshot is incomplete', 'STALE_REVISION');
      try {
        await validateAndApplyRevisionTree(
          tx,
          course.id,
          { modules: revision.data.modules },
          revision.data.base
        );
      } catch {
        throw new Conflict('Course revision references are stale', 'STALE_REVISION');
      }
    }
    if (Object.keys(revision.data.course ?? {}).length) {
      await applyFields(tx, course.id, revision.data.course as CourseFields);
    }
    await repository.decideRevision(tx, revision.id, reviewer.id, 'approved');
  });
}

export async function rejectCourseRevision(
  reviewer: Actor,
  revisionId: string,
  reason: string
): Promise<void> {
  await withTx(async (tx) => {
    const { revision } = await lockPendingRevision(tx, revisionId);
    await repository.decideRevision(tx, revision.id, reviewer.id, 'rejected', reason);
  });
}

export async function getRevisionDiff(revisionId: string, actor: Actor) {
  const revision = await repository.findRevision(db, revisionId);
  if (!revision) throw new NotFound('Course revision not found');
  const tree = await authoringTree(revision.courseId, actor);
  const currentCourse = revisionCourse(tree.course as Course);
  const proposedCourse = { ...currentCourse, ...revision.data.course };
  return {
    id: revision.id,
    courseId: revision.courseId,
    status: revision.status,
    rejectionReason: revision.rejectionReason,
    submittedBy: revision.submittedBy,
    submittedAt: revision.submittedAt,
    lastDecision: decisionSummary(revision.status === 'pending' ? undefined : revision),
    changes: summarizeRevision({
      courseTitle: currentCourse.title,
      courseChanges: revision.data.course,
      live: tree.modules as ModuleLike[],
      proposed: revision.data.modules as ModuleLike[] | undefined
    }),
    diff: {
      course: { before: currentCourse, after: proposedCourse },
      modules: {
        before: tree.modules,
        after: revision.data.modules ?? tree.modules
      }
    }
  };
}

export async function listPendingCourseRevisions() {
  return repository.pendingRevisions(db);
}
