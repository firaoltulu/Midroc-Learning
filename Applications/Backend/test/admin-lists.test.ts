import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { asUser, buildTestApp } from './harness/app.js';
import { createPgliteDatabase } from './harness/pglite.js';

const MIGRATIONS = [
  '001_init.sql',
  '002_course_content.sql',
  '003_youtube_video.sql',
  '004_course_language.sql',
  '005_course_details.sql',
  '006_course_reviews.sql',
  '007_review_ids.sql',
  '008_discussions_notes.sql'
];

const adminId = '8e3f5c4a-2f6d-4e73-9c99-3d4e5f6a7b01';
const almazId = '8e3f5c4a-2f6d-4e73-9c99-3d4e5f6a7b02';
const daniId = '8e3f5c4a-2f6d-4e73-9c99-3d4e5f6a7b03';

describe('admin lists: users with counts, top courses with ratings', () => {
  let server: Server | undefined;
  let closeDatabase: (() => Promise<void>) | undefined;
  let base = '';

  beforeEach(async () => {
    const pglite = createPgliteDatabase();
    closeDatabase = pglite.close;
    setDatabaseForTests(pglite.database);
    for (const migration of MIGRATIONS) {
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }
    await db.query(
      `INSERT INTO users (id, firebase_uid, email, name, role, created_at) VALUES
       ($1, 'admin', 'admin@example.test', 'Admin', 'admin', now() - interval '3 days'),
       ($2, 'almaz', 'almaz@example.test', 'Almaz Bekele', 'user', now() - interval '2 days'),
       ($3, 'dani', 'dani@example.test', 'Daniel Tesfaye', 'user', now() - interval '1 day')`,
      [adminId, almazId, daniId]
    );
    server = buildTestApp().listen(0);
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('no TCP port');
    base = `http://127.0.0.1:${address.port}/api`;
  });

  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
    setDatabaseForTests(undefined);
    await closeDatabase?.();
  });

  const asAdmin = { headers: asUser(adminId, 'admin').headers };

  async function course(ownerId: string, title: string): Promise<string> {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO courses (owner_id, title, status, published_at)
       VALUES ($1, $2, 'published', now()) RETURNING id`,
      [ownerId, title]
    );
    return rows[0]!.id;
  }

  it('lists users with the courses they own and take, searching names too', async () => {
    const farm = await course(almazId, 'Farm accounting');
    await course(almazId, 'Budgets');
    await db.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)', [daniId, farm]);

    const all = await fetch(`${base}/admin/users`, asAdmin);
    expect(all.status).toBe(200);
    expect(await all.json()).toMatchObject({
      total: 3,
      items: [
        { id: daniId, courseCount: 0, enrollmentCount: 1 },
        { id: almazId, courseCount: 2, enrollmentCount: 0 },
        { id: adminId, courseCount: 0, enrollmentCount: 0 }
      ]
    });

    const byName = await fetch(`${base}/admin/users?q=bekele`, asAdmin);
    expect(await byName.json()).toMatchObject({ total: 1, items: [{ email: 'almaz@example.test' }] });
    const byEmail = await fetch(`${base}/admin/users?q=dani%40`, asAdmin);
    expect(await byEmail.json()).toMatchObject({ total: 1, items: [{ id: daniId }] });
  });

  it('top courses carry their average rating', async () => {
    const farm = await course(almazId, 'Farm accounting');
    await course(almazId, 'Budgets');
    await db.query(
      'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $3), ($2, $3)',
      [daniId, adminId, farm]
    );
    await db.query(
      'INSERT INTO course_reviews (course_id, user_id, rating) VALUES ($1, $2, 5), ($1, $3, 4)',
      [farm, daniId, adminId]
    );
    const response = await fetch(`${base}/admin/analytics/courses`, asAdmin);
    expect(await response.json()).toMatchObject([
      { title: 'Farm accounting', enrollmentCount: 2, ratingAverage: 4.5 },
      { title: 'Budgets', enrollmentCount: 0, ratingAverage: null }
    ]);
  });
});
