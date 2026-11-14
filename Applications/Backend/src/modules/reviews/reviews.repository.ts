import type { Queryable } from '../../core/db/pool.js';
import { toPage } from '../../core/db/sql.js';

/**
 * A review as others see it. The author is shown as first name and last initial ("Sara T."),
 * never the email; `authorName` is null when the user has no name.
 */
export type PublicReview = {
  /** Opaque id (administrators remove a review by it). */
  id: string;
  authorName: string | null;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
  /** The viewer's own review. */
  mine: boolean;
};

/** "Sara Tadesse" -> "Sara T."; a single name stays as it is. */
const authorName = `
  CASE
    WHEN u.name IS NULL OR btrim(u.name) = '' THEN NULL
    WHEN cardinality(regexp_split_to_array(btrim(u.name), '[[:space:]]+')) = 1 THEN btrim(u.name)
    ELSE split_part(btrim(u.name), ' ', 1) || ' ' ||
      left((regexp_split_to_array(btrim(u.name), '[[:space:]]+'))[
        cardinality(regexp_split_to_array(btrim(u.name), '[[:space:]]+'))], 1) || '.'
  END
`;

export async function listForCourse(
  db: Queryable,
  courseId: string,
  viewerId: string,
  input: { limit: number; offset: number }
): Promise<{ items: PublicReview[]; total: number }> {
  // Reviews with a comment first (they say the most), then the newest.
  const { rows } = await db.query<PublicReview & { total: string }>(
    `SELECT r.id, ${authorName} AS "authorName", r.rating, r.comment,
       r.created_at AS "createdAt", r.updated_at AS "updatedAt",
       r.user_id = $2 AS mine, count(*) OVER() AS total
     FROM course_reviews r JOIN users u ON u.id = r.user_id
     WHERE r.course_id = $1
     ORDER BY (r.comment = ''), r.updated_at DESC, r.user_id
     LIMIT $3 OFFSET $4`,
    [courseId, viewerId, input.limit, input.offset]
  );
  return toPage(rows);
}

export type OwnReview = { rating: number; comment: string; updatedAt: Date };

export async function upsert(
  db: Queryable,
  courseId: string,
  userId: string,
  input: { rating: number; comment: string }
): Promise<{ created: boolean; review: OwnReview }> {
  const { rows } = await db.query<OwnReview & { created: boolean }>(
    `INSERT INTO course_reviews (course_id, user_id, rating, comment)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (course_id, user_id)
       DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment
     RETURNING rating, comment, updated_at AS "updatedAt", (xmax = 0) AS created`,
    [courseId, userId, input.rating, input.comment]
  );
  const { created, ...review } = rows[0]!;
  return { created, review };
}

/** Administrators: delete any review by its id. */
export async function removeById(db: Queryable, reviewId: string): Promise<boolean> {
  const { rows } = await db.query('DELETE FROM course_reviews WHERE id = $1 RETURNING id', [reviewId]);
  return rows.length > 0;
}

export async function remove(db: Queryable, courseId: string, userId: string): Promise<boolean> {
  const { rows } = await db.query(
    'DELETE FROM course_reviews WHERE course_id = $1 AND user_id = $2 RETURNING rating',
    [courseId, userId]
  );
  return rows.length > 0;
}
