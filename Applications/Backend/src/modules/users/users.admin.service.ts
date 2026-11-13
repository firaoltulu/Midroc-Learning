import type { Actor } from '../../core/actor.js';
import { db } from '../../core/db/pool.js';
import { withTx } from '../../core/db/tx.js';
import { Conflict, Forbidden, NotFound } from '../../core/http/app-error.js';
import { escapeLike } from '../../core/db/sql.js';
import { logger } from '../../core/logger.js';
import { revokeSessions, setRoleClaim } from '../../integrations/firebase/firebase.js';
import * as repository from './users.admin.repository.js';
import type { User } from './users.types.js';

export async function listUsers(input: Parameters<typeof repository.listUsers>[1]) {
  return repository.listUsers(db, {
    ...input,
    ...(input.q === undefined ? {} : { q: escapeLike(input.q) })
  });
}

export async function getUser(id: string): Promise<User> {
  const { rows } = await db.query<User>(
    `SELECT id, email, name, role, status, created_at AS "createdAt" FROM users WHERE id = $1`,
    [id]
  );
  if (!rows[0]) throw new NotFound('User not found');
  return rows[0];
}

export async function changeRole(
  actor: Actor,
  id: string,
  role: 'user' | 'admin'
): Promise<{ user: User; claimSynced: boolean }> {
  if (actor.id === id) throw new Forbidden('Administrators cannot change their own role', 'SELF_CHANGE_FORBIDDEN');
  const result = await withTx(async (tx) => {
    await repository.lockAdminRoster(tx);
    const user = await repository.getUserForUpdate(tx, id);
    if (!user) throw new NotFound('User not found');
    if (user.role === 'admin' && role !== 'admin' && user.status === 'active') {
      if (await repository.activeAdminCount(tx) <= 1) {
        throw new Conflict('The platform must retain an active administrator', 'LAST_ADMIN');
      }
    }
    await repository.updateRole(tx, id, role);
    return { uid: await repository.firebaseUid(tx, id), user: { ...user, role } };
  });
  let claimSynced = false;
  if (result.uid) {
    try {
      await setRoleClaim(result.uid, role);
      claimSynced = true;
    } catch (error) {
      logger.warn({ userId: id, err: error }, 'Unable to synchronize role claim');
    }
  }
  return { user: result.user, claimSynced };
}

export async function changeStatus(
  actor: Actor,
  id: string,
  status: 'active' | 'suspended'
): Promise<{ user: User; sessionsRevoked: boolean }> {
  if (actor.id === id) throw new Forbidden('Administrators cannot change their own status', 'SELF_CHANGE_FORBIDDEN');
  const result = await withTx(async (tx) => {
    await repository.lockAdminRoster(tx);
    const user = await repository.getUserForUpdate(tx, id);
    if (!user) throw new NotFound('User not found');
    if (user.role === 'admin' && user.status === 'active' && status !== 'active') {
      if (await repository.activeAdminCount(tx) <= 1) {
        throw new Conflict('The platform must retain an active administrator', 'LAST_ADMIN');
      }
    }
    await repository.updateStatus(tx, id, status);
    return { uid: await repository.firebaseUid(tx, id), user: { ...user, status } };
  });
  let sessionsRevoked = true;
  if (status === 'suspended' && result.uid) {
    try {
      await revokeSessions(result.uid);
    } catch (error) {
      sessionsRevoked = false;
      logger.warn({ userId: id, err: error }, 'Unable to revoke Firebase sessions');
    }
  }
  return { user: result.user, sessionsRevoked };
}
