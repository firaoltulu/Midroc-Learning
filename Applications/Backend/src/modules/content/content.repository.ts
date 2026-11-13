import type { Queryable } from '../../core/db/pool.js';

export type ItemForPlayback = {
  id: string;
  type: 'video' | 'pdf' | 'exam';
  youtubeVideoId: string | null;
  fileKey: string | null;
  ownerId: string;
  status: string;
  enrolled: boolean;
};

export async function itemForPlayback(
  db: Queryable,
  itemId: string,
  userId: string
): Promise<ItemForPlayback | undefined> {
  const { rows } = await db.query<ItemForPlayback>(
    `SELECT i.id, i.type, v.youtube_video_id AS "youtubeVideoId",
       p.file_path AS "fileKey", c.owner_id AS "ownerId", c.status,
       EXISTS (SELECT 1 FROM enrollments e
         WHERE e.course_id = c.id AND e.user_id = $2) AS enrolled
     FROM module_items i
     JOIN modules m ON m.id = i.module_id
     JOIN courses c ON c.id = m.course_id
     LEFT JOIN video_items v ON v.item_id = i.id
     LEFT JOIN pdf_items p ON p.item_id = i.id
     WHERE i.id = $1`,
    [itemId, userId]
  );
  return rows[0];
}

export async function referencedPdfKeys(db: Queryable): Promise<string[]> {
  const { rows } = await db.query<{ fileKey: string }>(
    'SELECT file_path AS "fileKey" FROM pdf_items'
  );
  return rows.map((row) => row.fileKey);
}
