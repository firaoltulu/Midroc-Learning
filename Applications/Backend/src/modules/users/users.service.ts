import { config } from '../../config.js';
import { db } from '../../core/db/pool.js';
import { withTx } from '../../core/db/tx.js';
import { Forbidden, NotFound } from '../../core/http/app-error.js';
import * as usersRepository from './users.repository.js';
import type { FirebaseProfile, User } from './users.types.js';

export async function findByFirebaseUid(uid: string): Promise<User | undefined> {
  return usersRepository.findByFirebaseUid(db, uid);
}

export async function createFromToken(profile: FirebaseProfile): Promise<User> {
  if (!profile.email) throw new Forbidden('An email address is required');
  return withTx(async (tx) => {
    const firstAdmin =
      profile.emailVerified && config.ADMIN_EMAILS.includes(profile.email.toLowerCase());
    const user = await usersRepository.createFromToken(tx, profile, firstAdmin);
    if (user.status !== 'active') throw new Forbidden('Account is suspended', 'ACCOUNT_SUSPENDED');
    return user;
  });
}

export async function getById(id: string): Promise<User> {
  const user = await usersRepository.getById(db, id);
  if (!user) throw new NotFound('User not found');
  return user;
}
