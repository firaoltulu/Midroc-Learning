import { createServer, type Server } from 'node:http';
import express from 'express';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { config } from '../src/config.js';
import { setDatabaseForTests } from '../src/core/db/pool.js';
import { errorHandler } from '../src/core/http/error-handler.js';
import { authenticate } from '../src/modules/auth/auth.middleware.js';
import { createPgliteDatabase } from './harness/pglite.js';
import { readFile } from 'node:fs/promises';

const firebaseMocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(),
  setRoleClaim: vi.fn(),
  revokeSessions: vi.fn()
}));

vi.mock('../src/integrations/firebase/firebase.js', () => firebaseMocks);

describe('Firebase authentication middleware', () => {
  let server: Server | undefined;
  let closeDatabase: (() => Promise<void>) | undefined;
  const savedAdmins = [...config.ADMIN_EMAILS];

  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
    setDatabaseForTests(undefined);
    await closeDatabase?.();
    closeDatabase = undefined;
    config.ADMIN_EMAILS.splice(0, config.ADMIN_EMAILS.length, ...savedAdmins);
    firebaseMocks.verifyIdToken.mockReset();
    firebaseMocks.setRoleClaim.mockReset();
    firebaseMocks.revokeSessions.mockReset();
  });

  async function setup() {
    const pglite = createPgliteDatabase();
    closeDatabase = pglite.close;
    setDatabaseForTests(pglite.database);
    for (const migration of [
      '001_init.sql',
      '002_course_content.sql',
      '003_youtube_video.sql',
      '004_course_language.sql',
      '005_course_details.sql',
      '006_course_reviews.sql'
    ]) {
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }
    const app = express();
    app.get('/secure', authenticate, (req, res) => res.json(req.user));
    app.use(errorHandler);
    server = createServer(app).listen(0);
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a TCP port');
    return `http://127.0.0.1:${address.port}/secure`;
  }

  it('creates a verified configured first admin and refreshes a stale role claim', async () => {
    const endpoint = await setup();
    config.ADMIN_EMAILS.push('admin@example.test');
    firebaseMocks.verifyIdToken.mockResolvedValue({
      aud: 'test-project',
      auth_time: 1,
      exp: 9999999999,
      firebase: { identities: { email: ['admin@example.test'] }, sign_in_provider: 'password' },
      iat: 1,
      iss: 'https://securetoken.google.com/test-project',
      sub: 'first-admin',
      uid: 'first-admin',
      email: 'admin@example.test',
      email_verified: true,
      role: 'user',
      name: 'Admin'
    } as DecodedIdToken);
    firebaseMocks.setRoleClaim.mockResolvedValue(undefined);
    const response = await fetch(endpoint, { headers: { authorization: 'Bearer good-token' } });
    expect(response.status).toBe(200);
    expect(response.headers.get('x-token-refresh')).toBe('true');
    expect(await response.json()).toMatchObject({ role: 'admin' });
    expect(firebaseMocks.setRoleClaim).toHaveBeenCalledWith(
      'first-admin',
      'admin'
    );
  });

  it('does not make an unverified configured email an administrator', async () => {
    const endpoint = await setup();
    config.ADMIN_EMAILS.push('admin@example.test');
    firebaseMocks.verifyIdToken.mockResolvedValue({
      aud: 'test-project',
      auth_time: 1,
      exp: 9999999999,
      firebase: { identities: { email: ['admin@example.test'] }, sign_in_provider: 'password' },
      iat: 1,
      iss: 'https://securetoken.google.com/test-project',
      sub: 'unverified-user',
      uid: 'unverified-user',
      email: 'admin@example.test',
      email_verified: false,
      role: 'user'
    } as DecodedIdToken);
    const response = await fetch(endpoint, { headers: { authorization: 'Bearer good-token' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ role: 'user' });
    expect(firebaseMocks.setRoleClaim).not.toHaveBeenCalled();
  });

  it('rejects missing and invalid credentials', async () => {
    const endpoint = await setup();
    expect((await fetch(endpoint)).status).toBe(401);
    firebaseMocks.verifyIdToken.mockRejectedValue(new Error('Invalid token'));
    expect((await fetch(endpoint, { headers: { authorization: 'Bearer bad-token' } })).status).toBe(401);
  });
});
