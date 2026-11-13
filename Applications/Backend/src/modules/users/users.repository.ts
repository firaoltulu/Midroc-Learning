import type { Queryable } from '../../core/db/pool.js';
import type { FirebaseProfile, User } from './users.types.js';

const userColumns = `
  id, email, name, role, status, created_at AS "createdAt"
`;

export async function findByFirebaseUid(db: Queryable, uid: string): Promise<User | undefined> {
  const { rows } = await db.query<User>(
    `SELECT ${userColumns} FROM users WHERE firebase_uid = $1`,
    [uid]
  );
  return rows[0];
}

export async function createFromToken(
  db: Queryable,
  profile: FirebaseProfile,
  firstAdmin: boolean
): Promise<User> {
  const inserted = await db.query<User>(
    `INSERT INTO users (firebase_uid, email, name, role)
     VALUES ($1, $2, $3, $4::user_role)
     ON CONFLICT (firebase_uid) DO NOTHING
     RETURNING ${userColumns}`,
    [profile.uid, profile.email, profile.name, firstAdmin ? 'admin' : 'user']
  );
  if (inserted.rows[0]) return inserted.rows[0];
  const existing = await findByFirebaseUid(db, profile.uid);
  if (!existing) throw new Error('User upsert did not return or find a row');
  return existing;
}

export async function getById(db: Queryable, id: string): Promise<User | undefined> {
  const { rows } = await db.query<User>(`SELECT ${userColumns} FROM users WHERE id = $1`, [id]);
  return rows[0];
}
