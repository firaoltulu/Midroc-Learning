import type { Queryable } from '../../core/db/pool.js';

export type Note = {
  id: string;
  body: string;
  positionSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const noteColumns = `id, body, position_seconds AS "positionSeconds",
  created_at AS "createdAt", updated_at AS "updatedAt"`;

/** The viewer's notes on an item: video notes by position, then the rest by time. */
export async function listMine(db: Queryable, userId: string, itemId: string): Promise<Note[]> {
  const { rows } = await db.query<Note>(
    `SELECT ${noteColumns} FROM item_notes WHERE user_id = $1 AND item_id = $2
     ORDER BY position_seconds NULLS LAST, created_at, id`,
    [userId, itemId]
  );
  return rows;
}

export async function insert(
  db: Queryable,
  input: { userId: string; itemId: string; body: string; positionSeconds: number | null }
): Promise<Note> {
  const { rows } = await db.query<Note>(
    `INSERT INTO item_notes (user_id, item_id, body, position_seconds)
     VALUES ($1, $2, $3, $4) RETURNING ${noteColumns}`,
    [input.userId, input.itemId, input.body, input.positionSeconds]
  );
  return rows[0]!;
}

/** Only the author's own note (undefined for anyone else's). */
export async function updateMine(
  db: Queryable,
  userId: string,
  noteId: string,
  body: string
): Promise<Note | undefined> {
  const { rows } = await db.query<Note>(
    `UPDATE item_notes SET body = $3 WHERE id = $2 AND user_id = $1 RETURNING ${noteColumns}`,
    [userId, noteId, body]
  );
  return rows[0];
}

export async function deleteMine(db: Queryable, userId: string, noteId: string): Promise<boolean> {
  const { rows } = await db.query(
    'DELETE FROM item_notes WHERE id = $2 AND user_id = $1 RETURNING id',
    [userId, noteId]
  );
  return rows.length > 0;
}
