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
  '006_course_reviews.sql'
];

const ownerId = '6c1f3a2e-0d4b-4c51-9a77-1b2c3d4e5f01';
const saraId = '6c1f3a2e-0d4b-4c51-9a77-1b2c3d4e5f02';
const dawitId = '6c1f3a2e-0d4b-4c51-9a77-1b2c3d4e5f03';
const outsiderId = '6c1f3a2e-0d4b-4c51-9a77-1b2c3d4e5f04';

describe('course ratings and reviews', () => {
  let server: Server | undefined;
  let closeDatabase: (() => Promise<void>) | undefined;
  let base = '';
  let courseId = '';

  beforeEach(async () => {
    const pglite = createPgliteDatabase();
    closeDatabase = pglite.close;
    setDatabaseForTests(pglite.database);
    for (const migration of MIGRATIONS) {
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }
    await db.query(
      `INSERT INTO users (id, firebase_uid, email, name) VALUES
       ($1, 'owner', 'owner@example.test', 'Almaz Bekele'),
       ($2, 'sara', 'sara@example.test', '  Sara  Tadesse '),
       ($3, 'dawit', 'dawit@example.test', 'Dawit'),
       ($4, 'outsider', 'outsider@example.test', NULL)`,
      [ownerId, saraId, dawitId, outsiderId]
    );
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO courses (owner_id, title, description, status, published_at)
       VALUES ($1, 'Farm accounting', 'About it', 'published', now()) RETURNING id`,
      [ownerId]
    );
    courseId = rows[0]!.id;
    await db.query(
      `INSERT INTO enrollments (user_id, course_id) VALUES ($1, $3), ($2, $3)`,
      [saraId, dawitId, courseId]
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

  const review = (userId: string, body: unknown) =>
    fetch(`${base}/courses/${courseId}/review`, {
      method: 'PUT',
      headers: { ...asUser(userId).headers, 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });

  it('enrolled learners rate once (saving again replaces it); the course shows the summary', async () => {
    const first = await review(saraId, { rating: 4, comment: '  Clear and practical. ' });
    expect(first.status, await first.clone().text()).toBe(201);
    expect(await first.json()).toMatchObject({ rating: 4, comment: 'Clear and practical.' });
    const again = await review(saraId, { rating: 5, comment: 'Clear and practical.' });
    expect(again.status).toBe(200);
    expect((await review(dawitId, { rating: 2 })).status).toBe(201);

    const detail = await fetch(`${base}/courses/${courseId}`, { headers: asUser(saraId).headers });
    expect(await detail.json()).toMatchObject({
      ratingAverage: 3.5,
      ratingCount: 2,
      ratingDistribution: { '1': 0, '2': 1, '3': 0, '4': 0, '5': 1 },
      myReview: { rating: 5, comment: 'Clear and practical.' }
    });
    const outsiderView = await fetch(`${base}/courses/${courseId}`, {
      headers: asUser(outsiderId).headers
    });
    expect(await outsiderView.json()).toMatchObject({ myReview: null, ratingCount: 2 });

    const catalog = await fetch(`${base}/courses`, { headers: asUser(outsiderId).headers });
    expect(await catalog.json()).toMatchObject({
      items: [{ id: courseId, ratingAverage: 3.5, ratingCount: 2 }]
    });
  });

  it('lists reviews with comments first, authors as "First L.", never emails', async () => {
    await review(dawitId, { rating: 3 });
    await review(saraId, { rating: 5, comment: 'The exam questions matched real situations.' });

    const response = await fetch(`${base}/courses/${courseId}/reviews?pageSize=10`, {
      headers: asUser(saraId).headers
    });
    expect(response.status).toBe(200);
    const body = (await response.json()) as { total: number; items: unknown[] };
    expect(body).toMatchObject({
      page: 1,
      pageSize: 10,
      total: 2,
      items: [
        { authorName: 'Sara T.', rating: 5, comment: 'The exam questions matched real situations.', mine: true },
        { authorName: 'Dawit', rating: 3, comment: '', mine: false }
      ]
    });
    expect(JSON.stringify(body)).not.toContain('@example.test');
    expect(JSON.stringify(body)).not.toContain(saraId);
  });

  it('refuses the owner, learners who are not enrolled, and invalid ratings', async () => {
    const owner = await review(ownerId, { rating: 5 });
    expect(owner.status).toBe(409);
    expect(await owner.json()).toMatchObject({ code: 'REVIEW_NOT_ALLOWED' });
    const outsider = await review(outsiderId, { rating: 5 });
    expect(outsider.status).toBe(409);
    expect(await outsider.json()).toMatchObject({ code: 'REVIEW_NOT_ALLOWED' });

    const invalid = await review(saraId, { rating: 6, comment: 'x'.repeat(2001), extra: true });
    expect(invalid.status).toBe(400);

    const draft = await db.query<{ id: string }>(
      `INSERT INTO courses (owner_id, title) VALUES ($1, 'Draft') RETURNING id`,
      [ownerId]
    );
    const hidden = await fetch(`${base}/courses/${draft.rows[0]!.id}/reviews`, {
      headers: asUser(saraId).headers
    });
    expect(hidden.status).toBe(404);
  });

  it('a learner deletes their own review', async () => {
    await review(saraId, { rating: 4 });
    const removed = await fetch(`${base}/courses/${courseId}/review`, {
      method: 'DELETE',
      headers: asUser(saraId).headers
    });
    expect(removed.status).toBe(204);
    const again = await fetch(`${base}/courses/${courseId}/review`, {
      method: 'DELETE',
      headers: asUser(saraId).headers
    });
    expect(again.status).toBe(404);
    const detail = await fetch(`${base}/courses/${courseId}`, { headers: asUser(saraId).headers });
    expect(await detail.json()).toMatchObject({ ratingAverage: null, ratingCount: 0, myReview: null });
  });
});
