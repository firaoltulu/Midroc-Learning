import type { Queryable } from '../../core/db/pool.js';

type OverviewTotals = {
  userCount: number;
  courseCount: number;
  publishedCourseCount: number;
  enrollmentCount: number;
  submittedAttemptCount: number;
  averageExamScore: number | null;
  examPassRate: number | null;
  enrollmentsLast30Days: number;
  activeLearnerCount: number;
  pendingRevisionCount: number;
};

export async function overview(db: Queryable) {
  const { rows } = await db.query<OverviewTotals>(
    `SELECT
       (SELECT count(*)::int FROM users) AS "userCount",
       (SELECT count(*)::int FROM courses) AS "courseCount",
       (SELECT count(*)::int FROM courses WHERE status = 'published') AS "publishedCourseCount",
       (SELECT count(*)::int FROM enrollments) AS "enrollmentCount",
       (SELECT count(*)::int FROM exam_attempts WHERE submitted_at IS NOT NULL) AS "submittedAttemptCount",
       (SELECT round(avg(score_percent), 2) FROM exam_attempts WHERE submitted_at IS NOT NULL) AS "averageExamScore",
       (SELECT round(100.0 * count(*) FILTER (WHERE passed) / nullif(count(*), 0), 2)
          FROM exam_attempts WHERE submitted_at IS NOT NULL) AS "examPassRate",
       (SELECT count(*)::int FROM enrollments
          WHERE enrolled_at >= now() - interval '30 days') AS "enrollmentsLast30Days",
       (SELECT count(*)::int FROM (
          SELECT user_id FROM item_progress WHERE updated_at >= now() - interval '30 days'
          UNION
          SELECT user_id FROM exam_attempts WHERE started_at >= now() - interval '30 days'
        ) active) AS "activeLearnerCount",
       (SELECT count(*)::int FROM course_revisions WHERE status = 'pending') AS "pendingRevisionCount"`
  );
  const { rows: statuses } = await db.query<{ status: string; count: number }>(
    'SELECT status, count(*)::int AS count FROM courses GROUP BY status'
  );
  const coursesByStatus: Record<string, number> = {
    draft: 0,
    pending_review: 0,
    published: 0,
    rejected: 0,
    archived: 0
  };
  for (const row of statuses) coursesByStatus[row.status] = row.count;
  return { ...rows[0], coursesByStatus };
}

/**
 * Per enrollment: the course's item count and how many of them the learner completed
 * (`c` = courses, `e` = enrollments).
 */
const enrollmentProgress = `
  LEFT JOIN LATERAL (
    SELECT count(i.id)::int AS item_count,
      count(p.item_id) FILTER (WHERE p.completed_at IS NOT NULL)::int AS completed_count
    FROM modules m JOIN module_items i ON i.module_id = m.id
    LEFT JOIN item_progress p ON p.item_id = i.id AND p.user_id = e.user_id
    WHERE m.course_id = c.id
  ) progress ON true`;

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
    `SELECT c.id, c.title, c.status, count(e.user_id)::int AS "enrollmentCount",
       count(e.user_id) FILTER (
         WHERE progress.item_count > 0 AND progress.completed_count = progress.item_count
       )::int AS "completedCount",
       round(100.0 * count(e.user_id) FILTER (
         WHERE progress.item_count > 0 AND progress.completed_count = progress.item_count
       ) / nullif(count(e.user_id), 0), 2) AS "completionRate"
     FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id
     ${enrollmentProgress}
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
  const summary = rows[0];
  if (!summary) return undefined;

  // Learners' progress (completed share of the course's items) in buckets.
  const { rows: progressRows } = await db.query<{ percent: number }>(
    `SELECT CASE WHEN progress.item_count = 0 THEN 0
       ELSE floor(100.0 * progress.completed_count / progress.item_count)::int END AS percent
     FROM enrollments e JOIN courses c ON c.id = e.course_id
     ${enrollmentProgress}
     WHERE e.course_id = $1`,
    [courseId]
  );
  const buckets = [
    { min: 0, max: 0 },
    { min: 1, max: 24 },
    { min: 25, max: 49 },
    { min: 50, max: 74 },
    { min: 75, max: 99 },
    { min: 100, max: 100 }
  ];
  const progressDistribution = buckets.map((bucket) => ({
    ...bucket,
    count: progressRows.filter((row) => row.percent >= bucket.min && row.percent <= bucket.max).length
  }));
  const enrolled = progressRows.length;
  const completedEnrollmentCount = progressRows.filter((row) => row.percent === 100).length;

  // Every item in course order: completions by enrolled learners; exams add attempt figures.
  const { rows: items } = await db.query(
    `SELECT i.id, i.type, i.title, m.id AS "moduleId", m.title AS "moduleTitle",
       (SELECT count(*)::int FROM item_progress p
          JOIN enrollments e ON e.user_id = p.user_id AND e.course_id = $1
          WHERE p.item_id = i.id AND p.completed_at IS NOT NULL) AS "completedCount",
       CASE WHEN i.type = 'exam' THEN (SELECT count(*)::int FROM exam_attempts a
          WHERE a.exam_id = i.id AND a.submitted_at IS NOT NULL) END AS "submittedAttemptCount",
       CASE WHEN i.type = 'exam' THEN (SELECT round(100.0 * count(*) FILTER (WHERE a.passed)
          / nullif(count(*), 0), 2) FROM exam_attempts a
          WHERE a.exam_id = i.id AND a.submitted_at IS NOT NULL) END AS "passRate",
       CASE WHEN i.type = 'exam' THEN (SELECT round(avg(a.score_percent), 2) FROM exam_attempts a
          WHERE a.exam_id = i.id AND a.submitted_at IS NOT NULL) END AS "averageScore"
     FROM modules m JOIN module_items i ON i.module_id = m.id
     WHERE m.course_id = $1 ORDER BY m.position, i.position`,
    [courseId]
  );
  const { rows: passRows } = await db.query<{ examPassRate: string | null }>(
    `SELECT round(100.0 * count(*) FILTER (WHERE a.passed) / nullif(count(*), 0), 2) AS "examPassRate"
     FROM exam_attempts a JOIN module_items i ON i.id = a.exam_id
     JOIN modules m ON m.id = i.module_id
     WHERE m.course_id = $1 AND a.submitted_at IS NOT NULL`,
    [courseId]
  );
  return {
    ...summary,
    examPassRate: passRows[0]?.examPassRate ?? null,
    completedEnrollmentCount,
    completionRate: enrolled === 0 ? null : Math.round((10_000 * completedEnrollmentCount) / enrolled) / 100,
    progressDistribution,
    items
  };
}
