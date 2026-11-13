import type { Queryable } from '../../core/db/pool.js';

export async function tryPdfCleanupLock(db: Queryable): Promise<boolean> {
  const { rows } = await db.query<{ locked: boolean }>(
    `SELECT pg_try_advisory_lock(hashtextextended('pdf-cleanup', 0)) AS locked`
  );
  return rows[0]?.locked ?? false;
}

export async function releasePdfCleanupLock(db: Queryable): Promise<void> {
  await db.query(`SELECT pg_advisory_unlock(hashtextextended('pdf-cleanup', 0))`);
}

export async function pendingRevisionPdfKeys(db: Queryable): Promise<string[]> {
  const { rows } = await db.query<{ fileKey: string }>(
    `SELECT DISTINCT jsonb_path_query(data, '$.**.fileKey') #>> '{}' AS "fileKey"
     FROM course_revisions WHERE status = 'pending'`
  );
  return rows.flatMap((row) => (row.fileKey ? [row.fileKey] : []));
}
