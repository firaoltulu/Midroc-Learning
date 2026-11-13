import type { Queryable } from '../../core/db/pool.js';

export async function overview(db: Queryable) {
  const { rows } = await db.query(
    `SELECT
       (SELECT count(*)::int FROM users) AS "userCount",
       (SELECT count(*)::int FROM courses) AS "courseCount",
       (SELECT count(*)::int FROM courses WHERE status = 'published') AS "publishedCourseCount",
       (SELECT count(*)::int FROM enrollments) AS "enrollmentCount",
       (SELECT count(*)::int FROM exam_attempts WHERE submitted_at IS NOT NULL) AS "submittedAttemptCount",
       (SELECT round(avg(score_percent), 2) FROM exam_attempts WHERE submitted_at IS NOT NULL) AS "averageExamScore"`
  );
  return rows[0];
}

export async function enrollmentSeries(
  db: Queryable,
  input: { from: string; to: string; interval: 'day' | 'week' | 'month'; courseId?: string | undefined }
) {
  const { rows } = await db.query(
    `WITH buckets AS (
      SELECT generate_series(
        date_trunc($3, $1::date),
        date_trunc($3, $2::date),
        ('1 ' || $3)::interval
      ) AS bucket
     )
     SELECT to_char(b.bucket AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS date,
       count(e.user_id)::int AS count
     FROM buckets b
     LEFT JOIN enrollments e
       ON date_trunc($3, e.enrolled_at AT TIME ZONE 'UTC') = b.bucket
       AND e.enrolled_at >= $1::date
       AND e.enrolled_at < $2::date + interval '1 day'
       AND ($4::uuid IS NULL OR e.course_id = $4)
     GROUP BY b.bucket ORDER BY b.bucket`,
    [input.from, input.to, input.interval, input.courseId ?? null]
  );
  return rows;
}

export async function topCourses(db: Queryable) {
  const { rows } = await db.query(
    `SELECT c.id, c.title, c.status, count(e.user_id)::int AS "enrollmentCount"
     FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id
     GROUP BY c.id ORDER BY "enrollmentCount" DESC, c.created_at DESC LIMIT 20`
  );
  return rows;
}

export async function courseDetail(db: Queryable, courseId: string) {
  const { rows } = await db.query(
    `SELECT c.id, c.title, c.status, count(DISTINCT e.user_id)::int AS "enrollmentCount",
       count(DISTINCT i.id)::int AS "itemCount",
       count(DISTINCT p.item_id) FILTER (WHERE p.completed_at IS NOT NULL)::int AS "completedItemCount",
       count(DISTINCT a.id) FILTER (WHERE a.submitted_at IS NOT NULL)::int AS "submittedAttemptCount",
       round(avg(a.score_percent) FILTER (WHERE a.submitted_at IS NOT NULL), 2) AS "averageExamScore"
     FROM courses c
     LEFT JOIN enrollments e ON e.course_id = c.id
     LEFT JOIN modules m ON m.course_id = c.id
     LEFT JOIN module_items i ON i.module_id = m.id
     LEFT JOIN item_progress p ON p.item_id = i.id
     LEFT JOIN exams x ON x.item_id = i.id
     LEFT JOIN exam_attempts a ON a.exam_id = x.item_id
     WHERE c.id = $1 GROUP BY c.id`,
    [courseId]
  );
  return rows[0];
}
