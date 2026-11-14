import type { Queryable } from '../../core/db/pool.js';

export async function tryYoutubeJobLock(db: Queryable): Promise<boolean> {
  const { rows } = await db.query<{ locked: boolean }>(
    `SELECT pg_try_advisory_lock(hashtextextended('youtube-check', 0)) AS locked`
  );
  return rows[0]?.locked ?? false;
}

export async function releaseYoutubeJobLock(db: Queryable): Promise<void> {
  await db.query(`SELECT pg_advisory_unlock(hashtextextended('youtube-check', 0))`);
}

export type YoutubeCandidate = {
  youtubeVideoId: string;
  isAvailable: boolean;
};

export async function dueYoutubeVideos(
  db: Queryable,
  maxAgeHours: number,
  batchSize: number
): Promise<YoutubeCandidate[]> {
  const { rows } = await db.query<YoutubeCandidate>(
    `SELECT v.youtube_video_id AS "youtubeVideoId", bool_and(v.is_available) AS "isAvailable"
     FROM video_items v
     JOIN module_items i ON i.id = v.item_id
     JOIN modules m ON m.id = i.module_id
     JOIN courses c ON c.id = m.course_id
     WHERE c.status IN ('published', 'pending_review')
       AND (v.last_checked_at IS NULL OR v.last_checked_at < now() - ($1::int * interval '1 hour'))
     GROUP BY v.youtube_video_id
     ORDER BY min(v.last_checked_at) NULLS FIRST, v.youtube_video_id
     LIMIT $2`,
    [maxAgeHours, batchSize]
  );
  return rows;
}

export async function updateYoutubeAvailability(
  db: Queryable,
  youtubeVideoId: string,
  available: boolean,
  metadata?: { title: string; thumbnailUrl: string }
): Promise<void> {
  await db.query(
    `UPDATE video_items v SET is_available = $2, last_checked_at = now(),
       youtube_title = COALESCE($3, v.youtube_title),
       thumbnail_url = COALESCE($4, v.thumbnail_url)
     FROM module_items i
     JOIN modules m ON m.id = i.module_id
     JOIN courses c ON c.id = m.course_id
     WHERE v.item_id = i.id AND v.youtube_video_id = $1
       AND c.status IN ('published', 'pending_review')`,
    [youtubeVideoId, available, metadata?.title ?? null, metadata?.thumbnailUrl ?? null]
  );
}

export async function unavailableYoutubeVideos(db: Queryable): Promise<unknown[]> {
  const { rows } = await db.query(
    `SELECT v.item_id AS "itemId", i.title AS "itemTitle",
       v.youtube_title AS "youtubeTitle", v.last_checked_at AS "lastCheckedAt",
       c.id AS "courseId", c.title AS "courseTitle",
       u.id AS "ownerId", u.name AS "ownerName", u.email AS "ownerEmail"
     FROM video_items v
     JOIN module_items i ON i.id = v.item_id
     JOIN modules m ON m.id = i.module_id
     JOIN courses c ON c.id = m.course_id
     JOIN users u ON u.id = c.owner_id
     WHERE NOT v.is_available AND c.status IN ('published', 'pending_review')
     ORDER BY v.last_checked_at DESC`
  );
  return rows;
}
