import type { Queryable } from '../../core/db/pool.js';
import { shortNameSql } from '../../core/db/display-name.js';
import { toPage } from '../../core/db/sql.js';

/** A post as learners see it: the author as "First L.", never email or id. */
export type Post = {
  id: string;
  authorName: string | null;
  /** Written by the viewer. */
  mine: boolean;
  /** Written by the course owner (shown as "Instructor"). */
  byInstructor: boolean;
  body: string;
  createdAt: Date;
  updatedAt: Date;
};

export type Thread = Post & { replyCount: number };

/** $2 = viewer id, $3 = course owner id. */
const postColumns = `
  p.id, ${shortNameSql('u.name')} AS "authorName",
  p.user_id = $2 AS mine, p.user_id = $3 AS "byInstructor",
  p.body, p.created_at AS "createdAt", p.updated_at AS "updatedAt"
`;

export async function listThreads(
  db: Queryable,
  itemId: string,
  viewer: { viewerId: string; ownerId: string },
  page: { limit: number; offset: number }
): Promise<{ items: Thread[]; total: number }> {
  const { rows } = await db.query<Thread & { total: string }>(
    `SELECT ${postColumns},
       (SELECT count(*)::int FROM discussion_posts r WHERE r.parent_id = p.id) AS "replyCount",
       count(*) OVER() AS total
     FROM discussion_posts p JOIN users u ON u.id = p.user_id
     WHERE p.item_id = $1 AND p.parent_id IS NULL
     ORDER BY p.created_at DESC, p.id
     LIMIT $4 OFFSET $5`,
    [itemId, viewer.viewerId, viewer.ownerId, page.limit, page.offset]
  );
  return toPage(rows);
}

export async function listReplies(
  db: Queryable,
  parentId: string,
  viewer: { viewerId: string; ownerId: string }
): Promise<Post[]> {
  const { rows } = await db.query<Post>(
    `SELECT ${postColumns}
     FROM discussion_posts p JOIN users u ON u.id = p.user_id
     WHERE p.parent_id = $1
     ORDER BY p.created_at, p.id`,
    [parentId, viewer.viewerId, viewer.ownerId]
  );
  return rows;
}

export async function insertPost(
  db: Queryable,
  input: { itemId: string; userId: string; parentId: string | null; body: string },
  ownerId: string
): Promise<Post> {
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO discussion_posts (item_id, user_id, parent_id, body)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [input.itemId, input.userId, input.parentId, input.body]
  );
  const { rows: posts } = await db.query<Post>(
    `SELECT ${postColumns} FROM discussion_posts p JOIN users u ON u.id = p.user_id
     WHERE p.id = $1`,
    [rows[0]!.id, input.userId, ownerId]
  );
  return posts[0]!;
}

export async function findPost(
  db: Queryable,
  postId: string
): Promise<{ id: string; itemId: string; userId: string; parentId: string | null } | undefined> {
  const { rows } = await db.query<{ id: string; itemId: string; userId: string; parentId: string | null }>(
    `SELECT id, item_id AS "itemId", user_id AS "userId", parent_id AS "parentId"
     FROM discussion_posts WHERE id = $1`,
    [postId]
  );
  return rows[0];
}

export async function deletePost(db: Queryable, postId: string): Promise<void> {
  await db.query('DELETE FROM discussion_posts WHERE id = $1', [postId]);
}
