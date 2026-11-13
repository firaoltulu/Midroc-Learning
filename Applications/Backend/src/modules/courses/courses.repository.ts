import type { Queryable } from '../../core/db/pool.js';
import type { Course, CourseFields, CourseStatus } from './courses.types.js';
import type { CourseCreateInput } from './courses.schemas.js';
import { updateRow } from '../../core/db/sql.js';

const courseColumns = `
  id, owner_id AS "ownerId", title, description, category, language,
  thumbnail_url AS "thumbnailUrl", tags,
  estimated_duration_minutes AS "estimatedDurationMinutes",
  status, rejection_reason AS "rejectionReason",
  created_at AS "createdAt", published_at AS "publishedAt"
`;

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
): Promise<{ items: Array<Course & { enrolled: boolean; moduleCount: number }>; total: number }> {
  const { rows } = await db.query<Course & { enrolled: boolean; moduleCount: number; total: string }>(
    `SELECT ${courseColumns},
       EXISTS (SELECT 1 FROM enrollments e WHERE e.course_id = c.id AND e.user_id = $1) AS enrolled,
       (SELECT count(*)::int FROM modules m WHERE m.course_id = c.id) AS "moduleCount",
       count(*) OVER() AS total
     FROM courses c
     WHERE c.status = 'published'
       AND ($2::text IS NULL OR c.title ILIKE '%' || $2 || '%' ESCAPE E'\\\\')
       AND ($3::text IS NULL OR c.category = $3)
       AND ($4::text IS NULL OR c.language = $4)
     ORDER BY c.published_at DESC NULLS LAST, c.id
     LIMIT $5 OFFSET $6`,
    [actorId, input.q ?? null, input.category ?? null, input.language ?? null, input.limit, input.offset]
  );
  return { items: rows, total: Number(rows[0]?.total ?? 0) };
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

export async function listMine(db: Queryable, ownerId: string): Promise<Course[]> {
  const { rows } = await db.query<Course>(
    `SELECT ${courseColumns} FROM courses c WHERE c.owner_id = $1 ORDER BY c.updated_at DESC`,
    [ownerId]
  );
  return rows;
}

export async function getPublicDetail(db: Queryable, id: string): Promise<unknown> {
  const course = await findById(db, id);
  if (!course) return undefined;
  const { rows: modules } = await db.query(
    `SELECT m.id, m.title, m.description, m.position,
       COALESCE(json_agg(json_build_object('id', i.id, 'type', i.type, 'title', i.title)
         ORDER BY i.position) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items
     FROM modules m LEFT JOIN module_items i ON i.module_id = m.id
     WHERE m.course_id = $1 GROUP BY m.id ORDER BY m.position`,
    [id]
  );
  return { ...course, modules };
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

export async function courseReadinessProblems(db: Queryable, id: string): Promise<string[]> {
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
  const problems: string[] = [];
  if (result.moduleCount === 0) problems.push('Course must contain at least one module');
  if (result.emptyModuleCount) problems.push('Every module must contain at least one item');
  if (result.emptyExamCount) problems.push('Every exam must contain at least one question');
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

export async function listAdminCourses(
  db: Queryable,
  input: {
    status?: CourseStatus | undefined;
    q?: string | undefined;
    limit: number;
    offset: number;
  }
): Promise<{ items: Array<Course & { total: string }>; total: number }> {
  const { rows } = await db.query<Course & { total: string }>(
    `SELECT ${courseColumns}, count(*) OVER() AS total
     FROM courses c
     WHERE ($1::course_status IS NULL OR c.status = $1::course_status)
       AND ($2::text IS NULL OR c.title ILIKE '%' || $2 || '%' ESCAPE E'\\\\')
     ORDER BY c.created_at DESC, c.id
     LIMIT $3 OFFSET $4`,
    [input.status ?? null, input.q ?? null, input.limit, input.offset]
  );
  return { items: rows, total: Number(rows[0]?.total ?? 0) };
}

export async function pendingCourses(db: Queryable): Promise<Course[]> {
  const { rows } = await db.query<Course>(
    `SELECT ${courseColumns} FROM courses c
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
