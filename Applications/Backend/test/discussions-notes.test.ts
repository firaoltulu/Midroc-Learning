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

const ownerId = '7d2e4b3f-1e5c-4d62-8b88-2c3d4e5f6a01';
const dawitId = '7d2e4b3f-1e5c-4d62-8b88-2c3d4e5f6a02';
const saraId = '7d2e4b3f-1e5c-4d62-8b88-2c3d4e5f6a03';
const outsiderId = '7d2e4b3f-1e5c-4d62-8b88-2c3d4e5f6a04';

describe('discussions and notes on a course item', () => {
  let server: Server | undefined;
  let closeDatabase: (() => Promise<void>) | undefined;
  let base = '';
  let courseId = '';
  let itemId = '';

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
       ($2, 'dawit', 'dawit@example.test', 'Dawit Mekonnen'),
       ($3, 'sara', 'sara@example.test', 'Sara Tadesse'),
       ($4, 'outsider', 'outsider@example.test', 'Outsider')`,
      [ownerId, dawitId, saraId, outsiderId]
    );
    const course = await db.query<{ id: string }>(
      `INSERT INTO courses (owner_id, title, status, published_at)
       VALUES ($1, 'Farm accounting', 'published', now()) RETURNING id`,
      [ownerId]
    );
    courseId = course.rows[0]!.id;
    const module = await db.query<{ id: string }>(
      `INSERT INTO modules (course_id, title, position) VALUES ($1, 'Module 1', 0) RETURNING id`,
      [courseId]
    );
    const item = await db.query<{ id: string }>(
      `INSERT INTO module_items (module_id, type, title, position)
       VALUES ($1, 'pdf', 'Recording a sale', 0) RETURNING id`,
      [module.rows[0]!.id]
    );
    itemId = item.rows[0]!.id;
    await db.query(`INSERT INTO enrollments (user_id, course_id) VALUES ($1, $3), ($2, $3)`, [
      dawitId,
      saraId,
      courseId
    ]);
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

  const send = (userId: string, method: string, path: string, body?: unknown, role: 'user' | 'admin' = 'user') =>
    fetch(`${base}${path}`, {
      method,
      headers: {
        ...asUser(userId, role).headers,
        ...(body === undefined ? {} : { 'content-type': 'application/json' })
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) })
    });

  it('learners start threads and reply; the owner answers as the instructor', async () => {
    const started = await send(dawitId, 'POST', `/items/${itemId}/discussions`, {
      body: '  Where do I record a sale paid in two parts? '
    });
    expect(started.status, await started.clone().text()).toBe(201);
    const thread = (await started.json()) as { id: string };
    expect(thread).toMatchObject({
      authorName: 'Dawit M.',
      mine: true,
      byInstructor: false,
      body: 'Where do I record a sale paid in two parts?',
      replyCount: 0
    });

    expect((await send(ownerId, 'POST', `/discussions/${thread.id}/replies`, { body: 'Record the payment received.' })).status).toBe(201);
    expect((await send(saraId, 'POST', `/discussions/${thread.id}/replies`, { body: 'Same question.' })).status).toBe(201);

    const list = await send(saraId, 'GET', `/items/${itemId}/discussions`);
    const page = (await list.json()) as { total: number; items: unknown[] };
    expect(page).toMatchObject({
      total: 1,
      items: [{ id: thread.id, authorName: 'Dawit M.', mine: false, replyCount: 2 }]
    });
    expect(JSON.stringify(page)).not.toContain('@example.test');

    const replies = await send(saraId, 'GET', `/discussions/${thread.id}/replies`);
    expect(await replies.json()).toMatchObject([
      { authorName: 'Almaz B.', byInstructor: true, mine: false, body: 'Record the payment received.' },
      { authorName: 'Sara T.', byInstructor: false, mine: true }
    ]);

    // Replies are one level deep: a reply has no replies.
    const replyId = ((await (await send(saraId, 'GET', `/discussions/${thread.id}/replies`)).json()) as Array<{ id: string }>)[0]!.id;
    expect((await send(saraId, 'POST', `/discussions/${replyId}/replies`, { body: 'x' })).status).toBe(404);
  });

  it('only people who may open the item read or post; posts need a published course', async () => {
    expect((await send(outsiderId, 'GET', `/items/${itemId}/discussions`)).status).toBe(404);
    expect((await send(outsiderId, 'POST', `/items/${itemId}/discussions`, { body: 'Hi' })).status).toBe(404);
    expect((await send(dawitId, 'POST', `/items/${itemId}/discussions`, { body: '   ' })).status).toBe(400);

    await db.query(`UPDATE courses SET status = 'archived' WHERE id = $1`, [courseId]);
    const archived = await send(ownerId, 'POST', `/items/${itemId}/discussions`, { body: 'Hi' });
    expect(archived.status).toBe(409);
    expect(await archived.json()).toMatchObject({ code: 'NOT_PUBLISHED' });
  });

  it('authors, the course owner and administrators delete posts; a thread takes its replies', async () => {
    const thread = (await (await send(dawitId, 'POST', `/items/${itemId}/discussions`, { body: 'Question' })).json()) as { id: string };
    await send(saraId, 'POST', `/discussions/${thread.id}/replies`, { body: 'Answer' });

    expect((await send(saraId, 'DELETE', `/discussions/${thread.id}`)).status).toBe(403);
    expect((await send(ownerId, 'DELETE', `/discussions/${thread.id}`)).status).toBe(204);
    expect((await send(dawitId, 'GET', `/discussions/${thread.id}/replies`)).status).toBe(404);
    const { rows } = await db.query('SELECT 1 FROM discussion_posts');
    expect(rows).toHaveLength(0);

    const second = (await (await send(dawitId, 'POST', `/items/${itemId}/discussions`, { body: 'Again' })).json()) as { id: string };
    await db.query(`UPDATE users SET role = 'admin' WHERE id = $1`, [outsiderId]);
    expect((await send(outsiderId, 'DELETE', `/discussions/${second.id}`, undefined, 'admin')).status).toBe(204);
  });

  it('notes are private to their author', async () => {
    const created = await send(dawitId, 'POST', `/items/${itemId}/notes`, { body: 'Split payments: two lines.', positionSeconds: 95 });
    expect(created.status, await created.clone().text()).toBe(201);
    const note = (await created.json()) as { id: string };
    expect(note).toMatchObject({ body: 'Split payments: two lines.', positionSeconds: 95 });
    await send(dawitId, 'POST', `/items/${itemId}/notes`, { body: 'General note' });

    expect(await (await send(dawitId, 'GET', `/items/${itemId}/notes`)).json()).toMatchObject([
      { body: 'Split payments: two lines.', positionSeconds: 95 },
      { body: 'General note', positionSeconds: null }
    ]);
    expect(await (await send(saraId, 'GET', `/items/${itemId}/notes`)).json()).toEqual([]);

    expect((await send(saraId, 'PATCH', `/notes/${note.id}`, { body: 'Mine now' })).status).toBe(404);
    expect((await send(saraId, 'DELETE', `/notes/${note.id}`)).status).toBe(404);
    const edited = await send(dawitId, 'PATCH', `/notes/${note.id}`, { body: 'Edited' });
    expect(await edited.json()).toMatchObject({ body: 'Edited', positionSeconds: 95 });
    expect((await send(dawitId, 'DELETE', `/notes/${note.id}`)).status).toBe(204);
    expect((await send(outsiderId, 'GET', `/items/${itemId}/notes`)).status).toBe(404);
    expect((await send(dawitId, 'POST', `/items/${itemId}/notes`, { body: 'x'.repeat(4001) })).status).toBe(400);
  });
});
