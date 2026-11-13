import type { Queryable } from '../../core/db/pool.js';

export async function insertEnrollment(
  db: Queryable,
  userId: string,
  courseId: string
): Promise<boolean> {
  const { rows } = await db.query<{ userId: string }>(
    `INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)
     ON CONFLICT (user_id, course_id) DO NOTHING
     RETURNING user_id AS "userId"`,
    [userId, courseId]
  );
  return rows.length === 1;
}

export async function deleteEnrollment(
  db: Queryable,
  userId: string,
  courseId: string
): Promise<void> {
  await db.query('DELETE FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, courseId]);
}

export async function isEnrolled(db: Queryable, userId: string, courseId: string): Promise<boolean> {
  const { rows } = await db.query<{ enrolled: boolean }>(
    'SELECT EXISTS (SELECT 1 FROM enrollments WHERE user_id = $1 AND course_id = $2) AS enrolled',
    [userId, courseId]
  );
  return rows[0]?.enrolled ?? false;
}

export async function listForUser(db: Queryable, userId: string): Promise<unknown[]> {
  const { rows } = await db.query(
    `SELECT c.id, c.title, c.description, c.category, c.language, c.thumbnail_url AS "thumbnailUrl",
       e.enrolled_at AS "enrolledAt",
       CASE WHEN stats.item_count = 0 THEN 0
         ELSE round(100.0 * stats.completed_count / stats.item_count)::int END AS "progressPercent"
     FROM enrollments e
     JOIN courses c ON c.id = e.course_id
     LEFT JOIN LATERAL (
       SELECT count(i.id)::int AS item_count,
         count(p.item_id) FILTER (WHERE p.completed_at IS NOT NULL)::int AS completed_count
       FROM modules m LEFT JOIN module_items i ON i.module_id = m.id
       LEFT JOIN item_progress p ON p.item_id = i.id AND p.user_id = e.user_id
       WHERE m.course_id = c.id
     ) stats ON true
     WHERE e.user_id = $1
     ORDER BY e.enrolled_at DESC`,
    [userId]
  );
  return rows;
}

export async function updateProgress(
  db: Queryable,
  userId: string,
  itemId: string,
  input: { lastPositionSeconds?: number | undefined; completed?: boolean | undefined }
): Promise<boolean> {
  const { rowCount } = await db.query(
    `INSERT INTO item_progress (user_id, item_id, last_position_seconds, completed_at)
     SELECT $1, i.id, $3, CASE WHEN $4::boolean THEN now() ELSE NULL END
     FROM module_items i WHERE i.id = $2 AND i.type IN ('video', 'pdf')
     ON CONFLICT (user_id, item_id) DO UPDATE SET
       last_position_seconds = COALESCE(EXCLUDED.last_position_seconds, item_progress.last_position_seconds),
       completed_at = COALESCE(item_progress.completed_at, EXCLUDED.completed_at)`,
    [userId, itemId, input.lastPositionSeconds ?? null, input.completed ?? false]
  );
  return rowCount === 1;
}

export async function canUpdateProgress(
  db: Queryable,
  userId: string,
  itemId: string
): Promise<boolean> {
  const { rows } = await db.query<{ enrolled: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM enrollments e
       JOIN module_items i ON i.id = $2
       JOIN modules m ON m.id = i.module_id
       JOIN courses c ON c.id = m.course_id AND c.status = 'published'
       WHERE e.user_id = $1 AND e.course_id = c.id
     ) AS enrolled`,
    [userId, itemId]
  );
  return rows[0]?.enrolled ?? false;
}

export async function markComplete(
  db: Queryable,
  userId: string,
  itemId: string
): Promise<void> {
  await db.query(
    `INSERT INTO item_progress (user_id, item_id, completed_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, item_id) DO UPDATE SET
       completed_at = COALESCE(item_progress.completed_at, EXCLUDED.completed_at)`,
    [userId, itemId]
  );
}
