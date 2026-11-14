import type { Queryable } from '../../core/db/pool.js';
import type { Course, CourseFields, CourseStatus } from './courses.types.js';
import type { CourseCreateInput } from './courses.schemas.js';
import { toPage, updateRow } from '../../core/db/sql.js';

const courseColumns = `
  id, owner_id AS "ownerId", title, description, category, language,
  thumbnail_url AS "thumbnailUrl", tags,
  estimated_duration_minutes AS "estimatedDurationMinutes",
  status, rejection_reason AS "rejectionReason",
  created_at AS "createdAt", published_at AS "publishedAt"
`;

/** courseColumns qualified with `c.`, for queries that join other tables. */
const joinedCourseColumns = `
  c.id, c.owner_id AS "ownerId", c.title, c.description, c.category, c.language,
  c.thumbnail_url AS "thumbnailUrl", c.tags,
  c.estimated_duration_minutes AS "estimatedDurationMinutes",
  c.status, c.rejection_reason AS "rejectionReason",
  c.created_at AS "createdAt", c.published_at AS "publishedAt"
`;

/** Columns of catalog and detail views (need `c` = courses, `u` = owner, `$1` = viewer id). */
const listingColumns = `
  u.name AS "ownerName",
  EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = $1) AS enrolled,
  (SELECT count(*)::int FROM modules m WHERE m.course_id = c.id) AS "moduleCount",
  (SELECT count(*)::int FROM enrollments e WHERE e.course_id = c.id) AS "enrollmentCount"
`;

export type CatalogCourse = Course & {
  ownerName: string | null;
  enrolled: boolean;
  moduleCount: number;
  enrollmentCount: number;
};

export type CourseDetail = CatalogCourse & {
  modules: Array<{
    id: string;
    title: string;
    description: string;
    position: number;
    items: Array<{ id: string; type: 'video' | 'pdf' | 'exam'; title: string }>;
  }>;
  /** Items of this course the viewer has completed. */
  completedItemIds: string[];
  /** Owner and administrators only (null for everyone else). */
  pendingRevision: { id: string; submittedAt: Date } | null;
};

export async function insertCourse(
  db: Queryable,
  ownerId: string,
  input: CourseCreateInput
): Promise<Course> {
  const { rows } = await db.query<Course>(
    `INSERT INTO courses
      (owner_id, title, description, category, language, thumbnail_url, tags, estimated_duration_minutes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${courseColumns}`,
    [
      ownerId,
      input.title,
      input.description,
      input.category ?? null,
      input.language,
      input.thumbnailUrl ?? null,
      input.tags,
      input.estimatedDurationMinutes ?? null
    ]
  );
  return rows[0]!;
}

export async function findById(db: Queryable, id: string, lock = false): Promise<Course | undefined> {
  const { rows } = await db.query<Course>(
    `SELECT ${courseColumns} FROM courses WHERE id = $1${lock ? ' FOR UPDATE' : ''}`,
    [id]
  );
  return rows[0];
}

export async function resolveContext(
  db: Queryable,
  kind: 'course' | 'module' | 'item',
  id: string,
  lock: boolean
): Promise<{ id: string; ownerId: string; status: CourseStatus } | undefined> {
  const query = kind === 'course'
    ? `SELECT c.id, c.owner_id AS "ownerId", c.status FROM courses c WHERE c.id = $1${lock ? ' FOR UPDATE' : ''}`
    : kind === 'module'
      ? `SELECT c.id, c.owner_id AS "ownerId", c.status FROM courses c JOIN modules m ON m.course_id = c.id WHERE m.id = $1${lock ? ' FOR UPDATE OF c' : ''}`
      : `SELECT c.id, c.owner_id AS "ownerId", c.status FROM courses c JOIN modules m ON m.course_id = c.id JOIN module_items i ON i.module_id = m.id WHERE i.id = $1${lock ? ' FOR UPDATE OF c' : ''}`;
  const { rows } = await db.query<{ id: string; ownerId: string; status: CourseStatus }>(query, [id]);
  return rows[0];
}

export async function listCatalog(
  db: Queryable,
  actorId: string,
  input: { q?: string; category?: string; language?: string; limit: number; offset: number }
): Promise<{ items: CatalogCourse[]; total: number }> {
  const { rows } = await db.query<CatalogCourse & { total: string }>(
    `SELECT ${joinedCourseColumns}, ${listingColumns},
       count(*) OVER() AS total
     FROM courses c JOIN users u ON u.id = c.owner_id
     WHERE c.status = 'published'
       AND ($2::text IS NULL OR c.title ILIKE '%' || $2 || '%' ESCAPE E'\\\\')
       AND ($3::text IS NULL OR c.category = $3)
       AND ($4::text IS NULL OR c.language = $4)
     ORDER BY c.published_at DESC NULLS LAST, c.id
     LIMIT $5 OFFSET $6`,
    [actorId, input.q ?? null, input.category ?? null, input.language ?? null, input.limit, input.offset]
  );
  return toPage(rows);
}

export async function listCategories(db: Queryable): Promise<string[]> {
  const { rows } = await db.query<{ category: string }>(
    `SELECT DISTINCT category
     FROM courses
     WHERE status = 'published' AND category IS NOT NULL AND category <> ''
     ORDER BY category`
  );
  return rows.map(({ category }) => category);
}

/** A course in its owner's list: when it last changed, its size, and any pending revision. */
export type OwnedCourse = Course & {
  updatedAt: Date;
  moduleCount: number;
  enrollmentCount: number;
  pendingRevision: { id: string; submittedAt: Date } | null;
};

export async function listMine(db: Queryable, ownerId: string): Promise<OwnedCourse[]> {
  const { rows } = await db.query<OwnedCourse>(
    `SELECT ${joinedCourseColumns}, c.updated_at AS "updatedAt",
       (SELECT count(*)::int FROM modules m WHERE m.course_id = c.id) AS "moduleCount",
       (SELECT count(*)::int FROM enrollments e WHERE e.course_id = c.id) AS "enrollmentCount",
       (SELECT json_build_object('id', r.id, 'submittedAt', r.submitted_at)
          FROM course_revisions r WHERE r.course_id = c.id AND r.status = 'pending') AS "pendingRevision"
     FROM courses c WHERE c.owner_id = $1 ORDER BY c.updated_at DESC, c.id`,
    [ownerId]
  );
  return rows;
}

export async function getDetail(
  db: Queryable,
  id: string,
  viewer: { id: string; canManage: boolean }
): Promise<CourseDetail | undefined> {
  const { rows } = await db.query<CatalogCourse & { pendingRevision: CourseDetail['pendingRevision'] }>(
    `SELECT ${joinedCourseColumns}, ${listingColumns},
       (SELECT json_build_object('id', r.id, 'submittedAt', r.submitted_at)
          FROM course_revisions r WHERE r.course_id = c.id AND r.status = 'pending') AS "pendingRevision"
     FROM courses c JOIN users u ON u.id = c.owner_id
     WHERE c.id = $2`,
    [viewer.id, id]
  );
  const course = rows[0];
  if (!course) return undefined;
  const { rows: modules } = await db.query<CourseDetail['modules'][number]>(
    `SELECT m.id, m.title, m.description, m.position,
       COALESCE(json_agg(json_build_object('id', i.id, 'type', i.type, 'title', i.title)
         ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items
     FROM modules m LEFT JOIN module_items i ON i.module_id = m.id
     WHERE m.course_id = $1 GROUP BY m.id ORDER BY m.position`,
    [id]
  );
  const { rows: completed } = await db.query<{ id: string }>(
    `SELECT p.item_id AS id FROM item_progress p
     JOIN module_items i ON i.id = p.item_id JOIN modules m ON m.id = i.module_id
     WHERE m.course_id = $1 AND p.user_id = $2 AND p.completed_at IS NOT NULL`,
    [id, viewer.id]
  );
  return {
    ...course,
    rejectionReason: viewer.canManage ? course.rejectionReason : null,
    pendingRevision: viewer.canManage ? course.pendingRevision : null,
    modules,
    completedItemIds: completed.map((row) => row.id)
  };
}

export async function submitCourse(db: Queryable, id: string): Promise<void> {
  await db.query(
    `UPDATE courses SET status = 'pending_review', rejection_reason = NULL
     WHERE id = $1`,
    [id]
  );
}

export async function hasEnrollments(db: Queryable, id: string): Promise<boolean> {
  const { rows } = await db.query<{ exists: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM enrollments WHERE course_id = $1) AS exists',
    [id]
  );
  return rows[0]?.exists ?? false;
}

export async function hardDelete(db: Queryable, id: string): Promise<void> {
  await db.query('DELETE FROM courses WHERE id = $1', [id]);
}

export async function archive(db: Queryable, id: string): Promise<void> {
  await db.query(`UPDATE courses SET status = 'archived' WHERE id = $1`, [id]);
}

export type ReadinessProblem = 'DESCRIPTION_REQUIRED' | 'NO_MODULES' | 'EMPTY_MODULE' | 'EMPTY_EXAM';

export async function courseReadinessProblems(
  db: Queryable,
  id: string
): Promise<ReadinessProblem[]> {
  const { rows } = await db.query<{ moduleCount: number; emptyModuleCount: number; emptyExamCount: number }>(
    `SELECT
       (SELECT count(*)::int FROM modules WHERE course_id = $1) AS "moduleCount",
       (SELECT count(*)::int FROM modules m WHERE m.course_id = $1
         AND NOT EXISTS (SELECT 1 FROM module_items i WHERE i.module_id = m.id)) AS "emptyModuleCount",
       (SELECT count(*)::int FROM exams e JOIN module_items i ON i.id = e.item_id
         JOIN modules m ON m.id = i.module_id WHERE m.course_id = $1
         AND NOT EXISTS (SELECT 1 FROM exam_questions q WHERE q.exam_id = e.item_id)) AS "emptyExamCount"`,
    [id]
  );
  const result = rows[0]!;
  const problems: ReadinessProblem[] = [];
  if (result.moduleCount === 0) problems.push('NO_MODULES');
  if (result.emptyModuleCount) problems.push('EMPTY_MODULE');
  if (result.emptyExamCount) problems.push('EMPTY_EXAM');
  return problems;
}

export async function updateStatus(
  db: Queryable,
  id: string,
  status: CourseStatus
): Promise<void> {
  await db.query('UPDATE courses SET status = $2::course_status WHERE id = $1', [id, status]);
}

export async function reviewCourse(
  db: Queryable,
  id: string,
  reviewerId: string,
  status: 'published' | 'rejected',
  reason?: string
): Promise<void> {
  await db.query(
    `UPDATE courses SET status = $3::course_status, rejection_reason = $4,
       reviewed_by = $2, reviewed_at = now(),
       published_at = CASE WHEN $3 = 'published' THEN now() ELSE published_at END
     WHERE id = $1`,
    [id, reviewerId, status, reason ?? null]
  );
}

/** Admin lists: the owner, the last change and the enrollment count (`c` = courses). */
const adminColumns = `
  ${joinedCourseColumns},
  u.name AS "ownerName", u.email AS "ownerEmail", c.updated_at AS "updatedAt",
  (SELECT count(*)::int FROM enrollments e WHERE e.course_id = c.id) AS "enrollmentCount"
`;

export type AdminCourse = Course & {
  ownerName: string | null;
  ownerEmail: string;
  updatedAt: Date;
  enrollmentCount: number;
};

export async function listAdminCourses(
  db: Queryable,
  input: {
    status?: CourseStatus | undefined;
    q?: string | undefined;
    limit: number;
    offset: number;
  }
): Promise<{ items: AdminCourse[]; total: number }> {
  const { rows } = await db.query<AdminCourse & { total: string }>(
    `SELECT ${adminColumns}, count(*) OVER() AS total
     FROM courses c JOIN users u ON u.id = c.owner_id
     WHERE ($1::course_status IS NULL OR c.status = $1::course_status)
       AND ($2::text IS NULL OR c.title ILIKE '%' || $2 || '%' ESCAPE E'\\\\')
     ORDER BY c.created_at DESC, c.id
     LIMIT $3 OFFSET $4`,
    [input.status ?? null, input.q ?? null, input.limit, input.offset]
  );
  return toPage(rows);
}

export async function pendingCourses(db: Queryable): Promise<AdminCourse[]> {
  const { rows } = await db.query<AdminCourse>(
    `SELECT ${adminColumns} FROM courses c JOIN users u ON u.id = c.owner_id
     WHERE c.status = 'pending_review' ORDER BY c.updated_at, c.id`
  );
  return rows;
}

const editableColumns: Readonly<Record<string, string>> = {
  title: 'title',
  description: 'description',
  category: 'category',
  language: 'language',
  thumbnailUrl: 'thumbnail_url',
  tags: 'tags',
  estimatedDurationMinutes: 'estimated_duration_minutes'
} as const;

export async function updateFields(
  db: Queryable,
  id: string,
  values: CourseFields
): Promise<Course | undefined> {
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const column = editableColumns[key];
    if (column) fields[key] = value;
  }
  await updateRow(db, 'courses', 'id', id, editableColumns, fields);
  return findById(db, id);
}
