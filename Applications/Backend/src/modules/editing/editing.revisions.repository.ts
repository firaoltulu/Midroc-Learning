import type { Queryable } from '../../core/db/pool.js';

export type RevisionData = {
  course: Record<string, string | null>;
  modules?: import('../content/index.js').RevisionTree['modules'];
  base?: import('../content/index.js').RevisionBase;
};

export type CourseRevision = {
  id: string;
  courseId: string;
  data: RevisionData;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason: string | null;
  submittedBy: string;
  submittedAt: Date;
  reviewedBy: string | null;
  reviewedAt: Date | null;
};

const revisionColumns = `
  id, course_id AS "courseId", data, status,
  rejection_reason AS "rejectionReason", submitted_by AS "submittedBy",
  submitted_at AS "submittedAt", reviewed_by AS "reviewedBy",
  reviewed_at AS "reviewedAt"`;

export async function pendingForCourse(
  db: Queryable,
  courseId: string,
  lock = false
): Promise<CourseRevision | undefined> {
  const { rows } = await db.query<CourseRevision>(
    `SELECT ${revisionColumns} FROM course_revisions
     WHERE course_id = $1 AND status = 'pending'${lock ? ' FOR UPDATE' : ''}`,
    [courseId]
  );
  return rows[0];
}

export async function latestDecision(db: Queryable, courseId: string): Promise<CourseRevision | undefined> {
  const { rows } = await db.query<CourseRevision>(
    `SELECT ${revisionColumns} FROM course_revisions
     WHERE course_id = $1 AND status <> 'pending'
     ORDER BY reviewed_at DESC NULLS LAST, submitted_at DESC, id LIMIT 1`,
    [courseId]
  );
  return rows[0];
}

export async function revisionCourseId(db: Queryable, revisionId: string): Promise<string | undefined> {
  const { rows } = await db.query<{ courseId: string }>(
    'SELECT course_id AS "courseId" FROM course_revisions WHERE id = $1',
    [revisionId]
  );
  return rows[0]?.courseId;
}

export async function findRevision(
  db: Queryable,
  revisionId: string,
  lock = false
): Promise<CourseRevision | undefined> {
  const { rows } = await db.query<CourseRevision>(
    `SELECT ${revisionColumns} FROM course_revisions WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
    [revisionId]
  );
  return rows[0];
}

export async function savePendingRevision(
  db: Queryable,
  courseId: string,
  actorId: string,
  data: RevisionData
): Promise<CourseRevision> {
  const pending = await pendingForCourse(db, courseId, true);
  if (pending) {
    const { rows } = await db.query<CourseRevision>(
      `UPDATE course_revisions SET data = $2::jsonb, submitted_by = $3,
         submitted_at = now(), rejection_reason = NULL
       WHERE id = $1 RETURNING ${revisionColumns}`,
      [pending.id, JSON.stringify(data), actorId]
    );
    return rows[0]!;
  }
  const { rows } = await db.query<CourseRevision>(
    `INSERT INTO course_revisions (course_id, data, submitted_by)
     VALUES ($1, $2::jsonb, $3) RETURNING ${revisionColumns}`,
    [courseId, JSON.stringify(data), actorId]
  );
  return rows[0]!;
}

export async function deletePendingRevision(db: Queryable, revisionId: string): Promise<void> {
  await db.query(`DELETE FROM course_revisions WHERE id = $1 AND status = 'pending'`, [revisionId]);
}

export async function decideRevision(
  db: Queryable,
  revisionId: string,
  reviewerId: string,
  decision: 'approved' | 'rejected',
  reason?: string
): Promise<void> {
  await db.query(
    `UPDATE course_revisions SET status = $2::revision_status,
       rejection_reason = $3, reviewed_by = $4, reviewed_at = now()
     WHERE id = $1`,
    [revisionId, decision, reason ?? null, reviewerId]
  );
}

export async function pendingRevisions(db: Queryable): Promise<Array<{
  id: string;
  courseId: string;
  courseTitle: string;
  ownerId: string;
  submittedBy: string;
  submittedAt: Date;
}>> {
  const { rows } = await db.query<{
    id: string;
    courseId: string;
    courseTitle: string;
    ownerId: string;
    submittedBy: string;
    submittedAt: Date;
  }>(
    `SELECT r.id, r.course_id AS "courseId", c.title AS "courseTitle",
       c.owner_id AS "ownerId", r.submitted_by AS "submittedBy",
       r.submitted_at AS "submittedAt"
     FROM course_revisions r JOIN courses c ON c.id = r.course_id
     WHERE r.status = 'pending' ORDER BY r.submitted_at, r.id`
  );
  return rows;
}
