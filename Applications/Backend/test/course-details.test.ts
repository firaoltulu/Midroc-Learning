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

const ownerId = '0b6a4f0e-7f61-4d1c-9a35-2b8a1c3e5d01';
const learnerId = '0b6a4f0e-7f61-4d1c-9a35-2b8a1c3e5d02';
const otherId = '0b6a4f0e-7f61-4d1c-9a35-2b8a1c3e5d03';

describe('course details, catalog sort, category counts and enrollment progress', () => {
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
      `INSERT INTO users (id, firebase_uid, email, name) VALUES
       ($1, 'owner', 'owner@example.test', 'Almaz Bekele'),
       ($2, 'learner', 'learner@example.test', NULL),
       ($3, 'other', 'other@example.test', NULL)`,
      [ownerId, learnerId, otherId]
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

  const json = (userId: string) => ({
    ...asUser(userId).headers,
    'content-type': 'application/json'
  });

  /** A published course with `moduleSizes[i]` video items in module i. */
  async function publishedCourse(
    title: string,
    options: { category?: string; publishedDaysAgo?: number; moduleSizes?: number[] } = {}
  ): Promise<{ id: string; itemIds: string[][] }> {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO courses (owner_id, title, description, category, status, published_at)
       VALUES ($1, $2, 'About it', $3, 'published', now() - make_interval(days => $4))
       RETURNING id`,
      [ownerId, title, options.category ?? null, options.publishedDaysAgo ?? 0]
    );
    const courseId = rows[0]!.id;
    const itemIds: string[][] = [];
    for (const [position, size] of (options.moduleSizes ?? []).entries()) {
      const { rows: modules } = await db.query<{ id: string }>(
        `INSERT INTO modules (course_id, title, position) VALUES ($1, $2, $3) RETURNING id`,
        [courseId, `Module ${position + 1}`, position]
      );
      const ids: string[] = [];
      for (let index = 0; index < size; index += 1) {
        const { rows: items } = await db.query<{ id: string }>(
          `INSERT INTO module_items (module_id, type, title, position)
           VALUES ($1, 'pdf', $2, $3) RETURNING id`,
          [modules[0]!.id, `Item ${index + 1}`, index]
        );
        ids.push(items[0]!.id);
      }
      itemIds.push(ids);
    }
    return { id: courseId, itemIds };
  }

  async function enroll(userId: string, courseId: string) {
    await db.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)', [userId, courseId]);
  }

  it('stores the level, outcomes and skills; they apply to a published course right away', async () => {
    const created = await fetch(`${base}/courses`, {
      method: 'POST',
      headers: json(ownerId),
      body: JSON.stringify({
        title: 'Farm accounting',
        level: 'beginner',
        outcomes: ['Record daily income and costs', ' Plan a seasonal budget '],
        skills: ['Bookkeeping', 'Budgeting']
      })
    });
    expect(created.status, await created.clone().text()).toBe(201);
    expect(await created.json()).toMatchObject({
      level: 'beginner',
      outcomes: ['Record daily income and costs', 'Plan a seasonal budget'],
      skills: ['Bookkeeping', 'Budgeting']
    });

    const invalid = await fetch(`${base}/courses`, {
      method: 'POST',
      headers: json(ownerId),
      body: JSON.stringify({ title: 'X', level: 'expert', outcomes: [''] })
    });
    expect(invalid.status).toBe(400);
    const issues = ((await invalid.json()) as { issues: Array<{ path: Array<string | number> }> })
      .issues;
    expect(issues.map((issue) => issue.path.join('.')).sort()).toEqual(['level', 'outcomes.0']);

    // Defaults for a course created without them.
    const plain = await fetch(`${base}/courses`, {
      method: 'POST',
      headers: json(ownerId),
      body: JSON.stringify({ title: 'Plain' })
    });
    expect(await plain.json()).toMatchObject({ level: null, outcomes: [], skills: [] });

    const live = await publishedCourse('Live course');
    // Level and skills apply to a published course right away.
    const patched = await fetch(`${base}/courses/${live.id}`, {
      method: 'PATCH',
      headers: json(ownerId),
      body: JSON.stringify({ level: 'advanced', skills: ['Leadership'] })
    });
    expect(patched.status, await patched.clone().text()).toBe(200);
    const detail = await fetch(`${base}/courses/${live.id}`, { headers: asUser(learnerId).headers });
    expect(await detail.json()).toMatchObject({ level: 'advanced', skills: ['Leadership'] });
  });

  it('outcomes of a published course change only through a reviewed revision', async () => {
    const live = await publishedCourse('Live course');
    const direct = await fetch(`${base}/courses/${live.id}`, {
      method: 'PATCH',
      headers: json(ownerId),
      body: JSON.stringify({ outcomes: ['Lead a team'] })
    });
    expect(direct.status).toBe(409);
    expect(await direct.json()).toMatchObject({ code: 'REVISION_REQUIRED' });

    // The same list as live: nothing to review.
    const unchanged = await fetch(`${base}/courses/${live.id}/revision`, {
      method: 'PUT',
      headers: json(ownerId),
      body: JSON.stringify({ course: { outcomes: [] } })
    });
    expect(await unchanged.json()).toMatchObject({ saved: false, unchanged: true });

    const saved = await fetch(`${base}/courses/${live.id}/revision`, {
      method: 'PUT',
      headers: json(ownerId),
      body: JSON.stringify({ course: { outcomes: ['Lead a team', 'Run a meeting'] } })
    });
    expect(saved.status, await saved.clone().text()).toBe(200);
    const body = (await saved.json()) as {
      revision: { id: string };
      changes: Array<{ kind: string; target: string; fields?: string[] }>;
    };
    expect(body.changes).toEqual([
      expect.objectContaining({ kind: 'edited', target: 'course', fields: ['outcomes'] })
    ]);
    // Still the live list until an administrator approves.
    const before = await fetch(`${base}/courses/${live.id}`, { headers: asUser(learnerId).headers });
    expect(await before.json()).toMatchObject({ outcomes: [] });

    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [otherId]);
    const review = await fetch(`${base}/admin/revisions/${body.revision.id}`, {
      headers: asUser(otherId, 'admin').headers
    });
    expect(await review.json()).toMatchObject({
      diff: { course: { before: { outcomes: [] }, after: { outcomes: ['Lead a team', 'Run a meeting'] } } }
    });
    const approved = await fetch(`${base}/admin/revisions/${body.revision.id}/approve`, {
      method: 'POST',
      headers: asUser(otherId, 'admin').headers
    });
    expect(approved.status, await approved.clone().text()).toBe(204);
    const after = await fetch(`${base}/courses/${live.id}`, { headers: asUser(learnerId).headers });
    expect(await after.json()).toMatchObject({ outcomes: ['Lead a team', 'Run a meeting'] });
  });

  it('sorts the catalog by newest (default) or by enrollments, and counts courses per category', async () => {
    const older = await publishedCourse('Older, popular', { category: 'Business', publishedDaysAgo: 10 });
    const newer = await publishedCourse('Newer', { category: 'Business', publishedDaysAgo: 1 });
    const data = await publishedCourse('Data course', { category: 'Data', publishedDaysAgo: 5 });
    await enroll(learnerId, older.id);
    await enroll(otherId, older.id);
    await enroll(learnerId, data.id);

    const titles = async (query: string) => {
      const response = await fetch(`${base}/courses${query}`, { headers: asUser(learnerId).headers });
      expect(response.status).toBe(200);
      return ((await response.json()) as { items: Array<{ title: string }> }).items.map(
        (item) => item.title
      );
    };
    expect(await titles('')).toEqual(['Newer', 'Data course', 'Older, popular']);
    expect(await titles('?sort=newest')).toEqual(['Newer', 'Data course', 'Older, popular']);
    expect(await titles('?sort=popular')).toEqual(['Older, popular', 'Data course', 'Newer']);
    expect(await titles('?sort=popular&category=Business')).toEqual(['Older, popular', 'Newer']);

    const badSort = await fetch(`${base}/courses?sort=rating`, { headers: asUser(learnerId).headers });
    expect(badSort.status).toBe(400);

    const categories = await fetch(`${base}/courses/categories`, { headers: asUser(learnerId).headers });
    expect(await categories.json()).toEqual({
      items: ['Business', 'Data'],
      categories: [
        { name: 'Business', courseCount: 2 },
        { name: 'Data', courseCount: 1 }
      ]
    });
    expect(newer.id).toBeTruthy();
  });

  it('my enrollments say which module comes next and when I last studied', async () => {
    const course = await publishedCourse('Three modules', { moduleSizes: [2, 1, 2] });
    const empty = await publishedCourse('Empty course');
    await enroll(learnerId, course.id);
    await enroll(learnerId, empty.id);

    const mine = async () => {
      const response = await fetch(`${base}/me/enrollments`, { headers: asUser(learnerId).headers });
      return (await response.json()) as Array<{
        id: string;
        moduleCount: number;
        currentModule: number | null;
        progressPercent: number;
        lastActivityAt: string;
        enrolledAt: string;
      }>;
    };

    let entry = (await mine()).find((row) => row.id === course.id)!;
    expect(entry).toMatchObject({ moduleCount: 3, currentModule: 1, progressPercent: 0 });
    expect(entry.lastActivityAt).toBe(entry.enrolledAt);

    // Finish module 1 and the first item of module 3: module 2 is next.
    const [first, second, third] = course.itemIds;
    for (const itemId of [...first!, third![0]!]) {
      await db.query(
        `INSERT INTO item_progress (user_id, item_id, completed_at, updated_at)
         VALUES ($1, $2, now(), now() + interval '1 minute')`,
        [learnerId, itemId]
      );
    }
    entry = (await mine()).find((row) => row.id === course.id)!;
    expect(entry).toMatchObject({ currentModule: 2, progressPercent: 60 });
    expect(new Date(entry.lastActivityAt).getTime()).toBeGreaterThan(new Date(entry.enrolledAt).getTime());

    for (const itemId of [...second!, third![1]!]) {
      await db.query(
        `INSERT INTO item_progress (user_id, item_id, completed_at) VALUES ($1, $2, now())`,
        [learnerId, itemId]
      );
    }
    entry = (await mine()).find((row) => row.id === course.id)!;
    expect(entry).toMatchObject({ currentModule: null, progressPercent: 100 });

    expect((await mine()).find((row) => row.id === empty.id)).toMatchObject({
      moduleCount: 0,
      currentModule: null,
      progressPercent: 0
    });
  });
});
