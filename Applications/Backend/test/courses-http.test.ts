import { afterEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { createPgliteDatabase } from './harness/pglite.js';
import { asUser, buildTestApp } from './harness/app.js';
import type { Server } from 'node:http';

describe('course HTTP behavior', () => {
  let server: Server | undefined;
  let closeDatabase: (() => Promise<void>) | undefined;

  afterEach(async () => {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = undefined;
    setDatabaseForTests(undefined);
    await closeDatabase?.();
    closeDatabase = undefined;
  });

  it('creates drafts, enforces strict schemas, and hides drafts from other users', async () => {
    expect(config.NODE_ENV).toBe('test');
    const pglite = createPgliteDatabase();
    closeDatabase = pglite.close;
    setDatabaseForTests(pglite.database);
    for (const migration of [
      '001_init.sql',
      '002_course_content.sql',
      '003_youtube_video.sql',
      '004_course_language.sql'
    ]) {
      const { readFile } = await import('node:fs/promises');
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }

    const ownerId = 'c5c53f56-bb74-4cd7-98c4-a6bbb9ac7e68';
    const viewerId = 'f73bd0d1-1f30-4d55-ae72-e70e01465f30';
    await db.query(
      `INSERT INTO users (id, firebase_uid, email) VALUES
       ($1, 'owner-firebase', 'owner@example.test'),
       ($2, 'viewer-firebase', 'viewer@example.test'),
       ($3, 'admin-firebase', 'admin@example.test')`,
      [ownerId, viewerId, '518d1bd3-a07a-462e-9f75-14d0b6802402']
    );
    await db.query(`UPDATE users SET role = 'admin' WHERE firebase_uid = 'admin-firebase'`);
    const adminId = '518d1bd3-a07a-462e-9f75-14d0b6802402';
    const app = buildTestApp();
    server = app.listen(0);
    await new Promise<void>((resolve) => server!.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Test server did not bind a TCP port');
    const base = `http://127.0.0.1:${address.port}/api`;

    const createResponse = await fetch(`${base}/courses`, {
      method: 'POST',
      headers: { ...asUser(ownerId).headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'Draft course',
        description: 'Complete course description',
        category: 'Technology',
        language: 'am'
      })
    });
    expect(createResponse.status).toBe(201);
    const course = (await createResponse.json()) as {
      id: string;
      status: string;
      language: string;
    };
    expect(course.status).toBe('draft');
    expect(course.language).toBe('am');

    const unknownFieldResponse = await fetch(`${base}/courses`, {
      method: 'POST',
      headers: { ...asUser(ownerId).headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Invalid', status: 'published' })
    });
    expect(unknownFieldResponse.status).toBe(400);

    const hiddenResponse = await fetch(`${base}/courses/${course.id}`, {
      headers: asUser(viewerId).headers
    });
    expect(hiddenResponse.status).toBe(404);

    const moduleResponse = await fetch(`${base}/courses/${course.id}/modules`, {
      method: 'POST',
      headers: { ...asUser(ownerId).headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Module 1' })
    });
    expect(moduleResponse.status).toBe(201);
    const module = (await moduleResponse.json()) as { id: string };
    const itemResponse = await fetch(`${base}/modules/${module.id}/items`, {
      method: 'POST',
      headers: { ...asUser(ownerId).headers, 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'exam',
        title: 'Quiz',
        questions: [{
          prompt: 'Question',
          choices: [
            { text: 'Right', isCorrect: true },
            { text: 'Wrong', isCorrect: false }
          ]
        }]
      })
    });
    expect(itemResponse.status).toBe(201);

    const authoring = await fetch(`${base}/courses/${course.id}/authoring`, {
      headers: asUser(ownerId).headers
    });
    const authoringBody = await authoring.json() as { modules: Array<{ items: Array<{ questions: Array<{ choices: Array<{ isCorrect: boolean }> }> }> }> };
    expect(authoringBody.modules[0]?.items[0]?.questions[0]?.choices[0]?.isCorrect).toBe(true);

    const learnerDetail = await fetch(`${base}/courses/${course.id}`, {
      headers: asUser(ownerId).headers
    });
    const learnerBody = await learnerDetail.text();
    expect(learnerBody).not.toContain('isCorrect');
    expect(learnerBody).not.toContain('youtubeVideoId');
    expect(learnerBody).not.toContain('fileKey');

    const submitResponse = await fetch(`${base}/courses/${course.id}/submit`, {
      method: 'POST',
      headers: asUser(ownerId).headers
    });
    expect(submitResponse.status).toBe(204);
    const approveResponse = await fetch(`${base}/admin/courses/${course.id}/approve`, {
      method: 'POST',
      headers: asUser(adminId, 'admin').headers
    });
    expect(approveResponse.status).toBe(204);
    const categoriesResponse = await fetch(`${base}/courses/categories`, {
      headers: asUser(viewerId).headers
    });
    expect(await categoriesResponse.json()).toEqual({ items: ['Technology'] });
    const filteredCatalogResponse = await fetch(
      `${base}/courses?category=Technology&language=am`,
      { headers: asUser(viewerId).headers }
    );
    expect(await filteredCatalogResponse.json()).toMatchObject({
      items: [{ id: course.id, language: 'am' }],
      total: 1
    });
    const otherLanguageResponse = await fetch(`${base}/courses?language=en`, {
      headers: asUser(viewerId).headers
    });
    expect(await otherLanguageResponse.json()).toMatchObject({ items: [], total: 0 });

    const minorCourseEdit = await fetch(`${base}/courses/${course.id}`, {
      method: 'PATCH',
      headers: { ...asUser(ownerId).headers, 'content-type': 'application/json' },
      body: JSON.stringify({ tags: ['updated'] })
    });
    expect(minorCourseEdit.status, await minorCourseEdit.text()).toBe(200);
    const majorCourseEdit = await fetch(`${base}/courses/${course.id}`, {
      method: 'PATCH',
      headers: { ...asUser(ownerId).headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Needs review' })
    });
    expect(majorCourseEdit.status).toBe(409);
    expect(await majorCourseEdit.json()).toMatchObject({ code: 'REVISION_REQUIRED' });
    const minorModuleEdit = await fetch(`${base}/modules/${module.id}`, {
      method: 'PATCH',
      headers: { ...asUser(ownerId).headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Live title' })
    });
    expect(minorModuleEdit.status).toBe(204);
    const structuralEdit = await fetch(`${base}/courses/${course.id}/modules`, {
      method: 'POST',
      headers: { ...asUser(ownerId).headers, 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'Needs revision' })
    });
    expect(structuralEdit.status).toBe(409);

    const ownerEnroll = await fetch(`${base}/courses/${course.id}/enroll`, {
      method: 'POST',
      headers: asUser(ownerId).headers
    });
    expect(ownerEnroll.status).toBe(409);
    const firstEnroll = await fetch(`${base}/courses/${course.id}/enroll`, {
      method: 'POST',
      headers: asUser(viewerId).headers
    });
    expect(firstEnroll.status).toBe(201);
    const repeatEnroll = await fetch(`${base}/courses/${course.id}/enroll`, {
      method: 'POST',
      headers: asUser(viewerId).headers
    });
    expect(repeatEnroll.status).toBe(200);

    // The authoring view (exam answers) is for the owner and administrators only.
    const learnerAuthoring = await fetch(`${base}/courses/${course.id}/authoring`, {
      headers: asUser(viewerId).headers
    });
    expect(learnerAuthoring.status).toBe(404);
    expect(await learnerAuthoring.text()).not.toContain('isCorrect');
    const adminAuthoring = await fetch(`${base}/courses/${course.id}/authoring`, {
      headers: asUser(adminId, 'admin').headers
    });
    expect(adminAuthoring.status).toBe(200);

    // Administrators list a course's enrollments and remove one (progress is kept).
    const enrollments = await fetch(`${base}/admin/courses/${course.id}/enrollments`, {
      headers: asUser(adminId, 'admin').headers
    });
    expect(enrollments.status).toBe(200);
    expect(await enrollments.json()).toMatchObject({
      page: 1,
      total: 1,
      items: [{ userId: viewerId, email: 'viewer@example.test', progressPercent: 0, itemCount: 1 }]
    });
    const forbidden = await fetch(`${base}/admin/courses/${course.id}/enrollments`, {
      headers: asUser(viewerId).headers
    });
    expect(forbidden.status).toBe(403);
    const removed = await fetch(`${base}/admin/courses/${course.id}/enrollments/${viewerId}`, {
      method: 'DELETE',
      headers: asUser(adminId, 'admin').headers
    });
    expect(removed.status).toBe(204);
    const missing = await fetch(`${base}/admin/courses/${course.id}/enrollments/${viewerId}`, {
      method: 'DELETE',
      headers: asUser(adminId, 'admin').headers
    });
    expect(missing.status).toBe(404);
  });
});
