import type { Queryable } from '../../core/db/pool.js';
import { toPage } from '../../core/db/sql.js';
import type { User } from './users.types.js';

export async function lockAdminRoster(db: Queryable): Promise<void> {
  await db.query(`SELECT pg_advisory_xact_lock(hashtextextended('admin-roster', 0))`);
}

/** A user in the administrators' list, with how many courses they own and take. */
export type AdminUser = User & { courseCount: number; enrollmentCount: number };

export async function listUsers(
  db: Queryable,
  input: {
    q?: string | undefined;
    role?: 'user' | 'admin' | undefined;
    status?: 'active' | 'suspended' | undefined;
    limit: number;
    offset: number;
  }
): Promise<{ items: AdminUser[]; total: number }> {
  const { rows } = await db.query<AdminUser & { total: string }>(
    `SELECT u.id, u.email, u.name, u.role, u.status, u.created_at AS "createdAt",
       (SELECT count(*)::int FROM courses c WHERE c.owner_id = u.id) AS "courseCount",
       (SELECT count(*)::int FROM enrollments e WHERE e.user_id = u.id) AS "enrollmentCount",
       count(*) OVER() AS total
     FROM users u
     WHERE ($1::text IS NULL
         OR u.email ILIKE '%' || $1 || '%' ESCAPE E'\\\\'
         OR u.name ILIKE '%' || $1 || '%' ESCAPE E'\\\\')
       AND ($2::user_role IS NULL OR u.role = $2::user_role)
       AND ($3::user_status IS NULL OR u.status = $3::user_status)
     ORDER BY u.created_at DESC, u.id
     LIMIT $4 OFFSET $5`,
    [input.q ?? null, input.role ?? null, input.status ?? null, input.limit, input.offset]
  );
  return toPage(rows);
}

export async function getUserForUpdate(db: Queryable, id: string): Promise<User | undefined> {
  const { rows } = await db.query<User>(
    `SELECT id, email, name, role, status, created_at AS "createdAt"
     FROM users WHERE id = $1 FOR UPDATE`,
    [id]
  );
  return rows[0];
}

export async function updateRole(
  db: Queryable,
  id: string,
  role: 'user' | 'admin'
): Promise<void> {
  await db.query('UPDATE users SET role = $2::user_role WHERE id = $1', [id, role]);
}

export async function updateStatus(
  db: Queryable,
  id: string,
  status: 'active' | 'suspended'
): Promise<void> {
  await db.query('UPDATE users SET status = $2::user_status WHERE id = $1', [id, status]);
}

export async function activeAdminCount(db: Queryable): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM users WHERE role = 'admin' AND status = 'active'`
  );
  return rows[0]?.count ?? 0;
}

export async function firebaseUid(db: Queryable, id: string): Promise<string | undefined> {
  const { rows } = await db.query<{ firebaseUid: string }>(
    'SELECT firebase_uid AS "firebaseUid" FROM users WHERE id = $1',
    [id]
  );
  return rows[0]?.firebaseUid;
}
