import type { Queryable } from '../../core/db/pool.js';

export type ContentModule = {
  id: string;
  title: string;
  description: string;
  position: number;
};

export type ContentItem = {
  id: string;
  type: 'video' | 'pdf' | 'exam';
  title: string;
  position: number;
  youtubeVideoId: string | null;
  youtubeTitle: string | null;
  isAvailable: boolean | null;
  fileKey: string | null;
  sizeBytes: number | null;
  pageCount: number | null;
  instructions: string | null;
  passingScorePercent: number | null;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
};

type ContentItemRow = Omit<ContentItem, 'sizeBytes'> & {
  sizeBytes: number | string | null;
};

function parseSizeBytes(value: number | string | null): number | null {
  if (value === null) return null;
  const sizeBytes = typeof value === 'string' ? Number(value) : value;
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes < 0) {
    throw new RangeError('PDF size_bytes must be a non-negative safe integer');
  }
  return sizeBytes;
}

export async function listModules(db: Queryable, courseId: string): Promise<ContentModule[]> {
  const { rows } = await db.query<ContentModule>(
    `SELECT id, title, description, position FROM modules
     WHERE course_id = $1 ORDER BY position`,
    [courseId]
  );
  return rows;
}

export async function listItems(db: Queryable, moduleId: string): Promise<ContentItem[]> {
  const { rows } = await db.query<ContentItemRow>(
    `SELECT i.id, i.type, i.title, i.position,
       v.youtube_video_id AS "youtubeVideoId", v.youtube_title AS "youtubeTitle",
       v.is_available AS "isAvailable",
       p.file_path AS "fileKey", p.size_bytes AS "sizeBytes", p.page_count AS "pageCount",
       e.instructions, e.passing_score_percent AS "passingScorePercent",
       e.max_attempts AS "maxAttempts", e.time_limit_minutes AS "timeLimitMinutes"
     FROM module_items i
     LEFT JOIN video_items v ON v.item_id = i.id
     LEFT JOIN pdf_items p ON p.item_id = i.id
     LEFT JOIN exams e ON e.item_id = i.id
     WHERE i.module_id = $1 ORDER BY i.position`,
    [moduleId]
  );
  return rows.map((row) => ({ ...row, sizeBytes: parseSizeBytes(row.sizeBytes) }));
}

export async function nextModulePosition(db: Queryable, courseId: string): Promise<number> {
  const { rows } = await db.query<{ position: number }>(
    'SELECT COALESCE(max(position) + 1, 0)::int AS position FROM modules WHERE course_id = $1',
    [courseId]
  );
  return rows[0]!.position;
}

export async function insertModule(
  db: Queryable,
  courseId: string,
  input: { title: string; description: string; position: number }
): Promise<ContentModule> {
  const { rows } = await db.query<ContentModule>(
    `INSERT INTO modules (course_id, title, description, position)
     VALUES ($1, $2, $3, $4) RETURNING id, title, description, position`,
    [courseId, input.title, input.description, input.position]
  );
  return rows[0]!;
}

export async function updateModule(
  db: Queryable,
  moduleId: string,
  input: { title?: string | undefined; description?: string | undefined }
): Promise<void> {
  if (input.title !== undefined) {
    await db.query('UPDATE modules SET title = $2 WHERE id = $1', [moduleId, input.title]);
  }
  if (input.description !== undefined) {
    await db.query('UPDATE modules SET description = $2 WHERE id = $1', [moduleId, input.description]);
  }
}

export async function removeModule(db: Queryable, moduleId: string): Promise<void> {
  await db.query('DELETE FROM modules WHERE id = $1', [moduleId]);
}

export async function moduleIds(db: Queryable, courseId: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    'SELECT id FROM modules WHERE course_id = $1 ORDER BY position',
    [courseId]
  );
  return rows.map((row) => row.id);
}

export async function saveModuleOrder(
  db: Queryable,
  moduleIds: string[]
): Promise<void> {
  for (const [position, id] of moduleIds.entries()) {
    await db.query('UPDATE modules SET position = $2 WHERE id = $1', [id, position]);
  }
}

export async function nextItemPosition(db: Queryable, moduleId: string): Promise<number> {
  const { rows } = await db.query<{ position: number }>(
    'SELECT COALESCE(max(position) + 1, 0)::int AS position FROM module_items WHERE module_id = $1',
    [moduleId]
  );
  return rows[0]!.position;
}

export async function insertItem(
  db: Queryable,
  moduleId: string,
  type: 'video' | 'pdf' | 'exam',
  title: string,
  position: number
): Promise<{ id: string }> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO module_items (module_id, type, title, position)
     VALUES ($1, $2::item_type, $3, $4) RETURNING id`,
    [moduleId, type, title, position]
  );
  return rows[0]!;
}

export async function insertVideoDetail(
  db: Queryable,
  itemId: string,
  details: { youtubeVideoId: string; title: string; thumbnailUrl: string }
): Promise<void> {
  await db.query(
    `INSERT INTO video_items (item_id, youtube_video_id, youtube_title, thumbnail_url)
     VALUES ($1, $2, $3, $4)`,
    [itemId, details.youtubeVideoId, details.title, details.thumbnailUrl]
  );
}

export async function insertPdfDetail(
  db: Queryable,
  itemId: string,
  details: { fileKey: string; sizeBytes: number; pageCount: number }
): Promise<void> {
  await db.query(
    `INSERT INTO pdf_items (item_id, file_path, size_bytes, page_count)
     VALUES ($1, $2, $3, $4)`,
    [itemId, details.fileKey, details.sizeBytes, details.pageCount]
  );
}

export async function itemType(db: Queryable, itemId: string) {
  const { rows } = await db.query<{ type: 'video' | 'pdf' | 'exam' }>(
    'SELECT type FROM module_items WHERE id = $1',
    [itemId]
  );
  return rows[0]?.type;
}

export async function updateItemTitle(db: Queryable, itemId: string, title: string): Promise<void> {
  await db.query('UPDATE module_items SET title = $2 WHERE id = $1', [itemId, title]);
}

export async function updateVideoDetail(
  db: Queryable,
  itemId: string,
  details: { youtubeVideoId: string; title: string; thumbnailUrl: string }
): Promise<void> {
  await db.query(
    `UPDATE video_items SET youtube_video_id = $2, youtube_title = $3, thumbnail_url = $4
     WHERE item_id = $1`,
    [itemId, details.youtubeVideoId, details.title, details.thumbnailUrl]
  );
}

export async function updatePdfDetail(
  db: Queryable,
  itemId: string,
  details: { fileKey: string; sizeBytes: number }
): Promise<void> {
  await db.query(
    'UPDATE pdf_items SET file_path = $2, size_bytes = $3 WHERE item_id = $1',
    [itemId, details.fileKey, details.sizeBytes]
  );
}

export async function updateExamSettings(
  db: Queryable,
  itemId: string,
  input: {
    instructions?: string | undefined;
    passingScorePercent?: number | undefined;
    maxAttempts?: number | null | undefined;
    timeLimitMinutes?: number | null | undefined;
  }
): Promise<void> {
  const values = [
    input.instructions ?? null,
    input.passingScorePercent ?? null,
    input.maxAttempts ?? null,
    input.timeLimitMinutes ?? null
  ];
  await db.query(
    `UPDATE exams SET instructions = COALESCE($2, instructions),
       passing_score_percent = COALESCE($3, passing_score_percent),
       max_attempts = CASE WHEN $4::boolean THEN $5::int ELSE max_attempts END,
       time_limit_minutes = CASE WHEN $6::boolean THEN $7::int ELSE time_limit_minutes END
     WHERE item_id = $1`,
    [
      itemId,
      values[0],
      values[1],
      input.maxAttempts !== undefined,
      values[2],
      input.timeLimitMinutes !== undefined,
      values[3]
    ]
  );
}

export async function removeItem(db: Queryable, itemId: string): Promise<void> {
  await db.query('DELETE FROM module_items WHERE id = $1', [itemId]);
}

export async function itemIds(db: Queryable, moduleId: string): Promise<string[]> {
  const { rows } = await db.query<{ id: string }>(
    'SELECT id FROM module_items WHERE module_id = $1 ORDER BY position',
    [moduleId]
  );
  return rows.map((row) => row.id);
}

export async function saveItemOrder(db: Queryable, ids: string[]): Promise<void> {
  for (const [position, id] of ids.entries()) {
    await db.query('UPDATE module_items SET position = $2 WHERE id = $1', [id, position]);
  }
}
