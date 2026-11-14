import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { asUser, buildTestApp } from './harness/app.js';
import { createPgliteDatabase } from './harness/pglite.js';

/** What learners and owners see: catalog, course detail and video playback. */
describe('learner views', () => {
  const ownerId = 'c5c53f56-bb74-4cd7-98c4-a6bbb9ac7e68';
  const learnerId = 'f73bd0d1-1f30-4d55-ae72-e70e01465f30';
  const otherId = '7d0f0f7e-6c1b-4bd4-9a51-0b1c6f1e8a22';
  const courseId = 'c8929b64-76d2-4799-af60-09d35e314f60';
  const moduleId = 'a2aa2739-dd1a-47cb-bc56-af0032663924';
  const videoId = '568ae546-461e-49ce-95f9-f0c9d91ee6b2';
  const brokenVideoId = 'f1279187-dba8-41b8-8ba0-9c2a61e37323';
  const revisionId = '06354d62-2e96-47a6-a2a5-2155a298a4e1';
  const pdfId = 'b6f2e4a8-1c3d-4e5f-9a7b-2c4d6e8f0a1b';
  const fileKey = '3f6c1a2b-4d5e-4f60-8a1b-2c3d4e5f6a7b.pdf';
  const pdfBytes = '%PDF-1.4 test document';
  let server: Server;
  let base: string;
  let closeDatabase: () => Promise<void>;

  beforeAll(async () => {
    const pglite = createPgliteDatabase();
    closeDatabase = pglite.close;
    setDatabaseForTests(pglite.database);
    for (const migration of [
      '001_init.sql',
      '002_course_content.sql',
      '003_youtube_video.sql',
      '004_course_language.sql',
      '005_course_details.sql',
      '006_course_reviews.sql',
      '007_review_ids.sql',
      '008_discussions_notes.sql'
    ]) {
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }
    await db.query(
      `INSERT INTO users (id, firebase_uid, email, name) VALUES
       ($1, 'owner', 'owner@example.test', 'Owner Name'),
       ($2, 'learner', 'learner@example.test', NULL),
       ($3, 'other', 'other@example.test', NULL)`,
      [ownerId, learnerId, otherId]
    );
    await db.query(
      `INSERT INTO courses (id, owner_id, title, status, rejection_reason, published_at)
       VALUES ($1, $2, 'Safety basics', 'published', 'Old reason', now())`,
      [courseId, ownerId]
    );
    await db.query(
      `INSERT INTO modules (id, course_id, title, position) VALUES ($1, $2, 'Module', 0)`,
      [moduleId, courseId]
    );
    await db.query(
      `INSERT INTO module_items (id, module_id, type, title, position) VALUES
       ($1, $3, 'video', 'Welcome', 0), ($2, $3, 'video', 'Gone video', 1)`,
      [videoId, brokenVideoId, moduleId]
    );
    await db.query(
      `INSERT INTO video_items (item_id, youtube_video_id, youtube_title, is_available) VALUES
       ($1, 'abcdefghijk', 'Welcome to safety', true),
       ($2, 'zyxwvutsrqp', NULL, false)`,
      [videoId, brokenVideoId]
    );
    await db.query(
      `INSERT INTO module_items (id, module_id, type, title, position) VALUES ($1, $2, 'pdf', 'Handbook', 2)`,
      [pdfId, moduleId]
    );
    await db.query(`INSERT INTO pdf_items (item_id, file_path) VALUES ($1, $2)`, [pdfId, fileKey]);
    await mkdir(config.PDF_ROOT, { recursive: true });
    await writeFile(path.join(config.PDF_ROOT, fileKey), pdfBytes);
    await db.query(`INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)`, [
      learnerId,
      courseId
    ]);
    await db.query(
      `INSERT INTO item_progress (user_id, item_id, last_position_seconds, completed_at)
       VALUES ($1, $2, 125, now())`,
      [learnerId, videoId]
    );
    await db.query(
      `INSERT INTO course_revisions (id, course_id, data, submitted_by)
       VALUES ($1, $2, '{"course":{"title":"New"}}', $3)`,
      [revisionId, courseId, ownerId]
    );

    server = buildTestApp().listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind');
    base = `http://127.0.0.1:${address.port}/api`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    setDatabaseForTests(undefined);
    await closeDatabase();
  });

  const get = async (path: string, userId: string) => {
    const response = await fetch(`${base}${path}`, { headers: asUser(userId).headers });
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };

  it('catalog items carry the owner name, enrollment count and my enrollment', async () => {
    const { body } = await get('/courses', learnerId);
    expect(body.items).toEqual([
      expect.objectContaining({
        id: courseId,
        ownerName: 'Owner Name',
        enrolled: true,
        moduleCount: 1,
        enrollmentCount: 1
      })
    ]);
  });

  it('course detail tells a learner what they completed, without owner-only data', async () => {
    const { body } = await get(`/courses/${courseId}`, learnerId);
    expect(body).toMatchObject({
      ownerName: 'Owner Name',
      enrolled: true,
      enrollmentCount: 1,
      moduleCount: 1,
      completedItemIds: [videoId],
      rejectionReason: null,
      pendingRevision: null
    });
  });

  it('course detail shows the owner the pending revision', async () => {
    const { body } = await get(`/courses/${courseId}`, ownerId);
    expect(body).toMatchObject({
      enrolled: false,
      completedItemIds: [],
      rejectionReason: 'Old reason',
      pendingRevision: { id: revisionId, submittedAt: expect.any(String) }
    });
  });

  it('my courses carry when they changed, their size and the pending revision', async () => {
    const response = await fetch(`${base}/me/courses`, { headers: asUser(ownerId).headers });
    expect(await response.json()).toEqual([
      expect.objectContaining({
        id: courseId,
        status: 'published',
        updatedAt: expect.any(String),
        moduleCount: 1,
        enrollmentCount: 1,
        pendingRevision: { id: revisionId, submittedAt: expect.any(String) }
      })
    ]);
  });

  it('video playback returns availability and where to resume', async () => {
    expect(await get(`/items/${videoId}/video`, learnerId)).toEqual({
      status: 200,
      body: {
        youtubeVideoId: 'abcdefghijk',
        youtubeTitle: 'Welcome to safety',
        isAvailable: true,
        lastPositionSeconds: 125,
        completed: true
      }
    });
    expect(await get(`/items/${brokenVideoId}/video`, learnerId)).toMatchObject({
      body: { isAvailable: false, lastPositionSeconds: 0, completed: false }
    });
  });

  it('video playback stays hidden from learners who are not enrolled', async () => {
    expect(await get(`/items/${videoId}/video`, otherId)).toMatchObject({
      status: 404,
      body: { code: 'NOT_FOUND' }
    });
  });

  it('streams the PDF itself when no nginx is in front (PDF_DELIVERY=stream)', async () => {
    expect(config.PDF_DELIVERY).toBe('stream');
    const response = await fetch(`${base}/items/${pdfId}/pdf`, { headers: asUser(learnerId).headers });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/pdf');
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    expect(await response.text()).toBe(pdfBytes);
  });
});
