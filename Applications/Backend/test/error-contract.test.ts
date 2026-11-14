import { readFile } from 'node:fs/promises';
import type { Server } from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { toValidationIssue } from '../src/core/http/error-handler.js';
import { questionsSchema } from '../src/modules/exams/exams.schemas.js';
import { asUser, buildTestApp } from './harness/app.js';
import { createPgliteDatabase } from './harness/pglite.js';

/**
 * Every error response is { error, code, params?, issues? } with a stable code that clients
 * translate (openapi.yaml, components/schemas/Error).
 */
describe('error contract', () => {
  const userId = 'c5c53f56-bb74-4cd7-98c4-a6bbb9ac7e68';
  const adminId = '518d1bd3-a07a-462e-9f75-14d0b6802402';
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
      '007_review_ids.sql'
    ]) {
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }
    await db.query(
      `INSERT INTO users (id, firebase_uid, email, role) VALUES
       ($1, 'user-firebase', 'user@example.test', 'user'),
       ($2, 'admin-firebase', 'admin@example.test', 'admin')`,
      [userId, adminId]
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

  const call = async (path: string, init: RequestInit & { as?: string; role?: 'user' | 'admin' } = {}) => {
    const response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        ...asUser(init.as ?? userId, init.role ?? 'user').headers,
        'content-type': 'application/json',
        ...init.headers
      }
    });
    return { status: response.status, body: (await response.json()) as Record<string, unknown> };
  };

  it('validation errors list issues as { path, code, message, params }', async () => {
    const { status, body } = await call('/courses', {
      method: 'POST',
      body: JSON.stringify({ title: '', thumbnailUrl: 'ftp://example.test/a.png' })
    });
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: 'VALIDATION_FAILED' });
    expect(body.issues).toEqual(
      expect.arrayContaining([
        {
          path: ['title'],
          code: 'too_small',
          message: expect.any(String),
          params: expect.objectContaining({ origin: 'string', minimum: 1 })
        },
        expect.objectContaining({ path: ['thumbnailUrl'], code: 'HTTP_URL_REQUIRED' })
      ])
    );
  });

  it('a rule of our own reports its specific code', () => {
    const result = questionsSchema.safeParse([
      {
        prompt: 'Which is safe?',
        isMultiple: false,
        choices: [
          { text: 'A', isCorrect: false },
          { text: 'B', isCorrect: false }
        ]
      }
    ]);
    expect(result.success).toBe(false);
    const issues = result.error?.issues.map(toValidationIssue) ?? [];
    expect(issues.map((issue) => issue.code)).toEqual([
      'CORRECT_CHOICE_REQUIRED',
      'SINGLE_CORRECT_CHOICE_REQUIRED'
    ]);
    expect(issues[0]?.path).toEqual([0, 'choices']);
  });

  it('an invalid id is INVALID_PARAMETER with the parameter name', async () => {
    const { status, body } = await call('/courses/not-a-uuid');
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: 'INVALID_PARAMETER', params: { name: 'id' } });
  });

  it('a missing resource and an unknown route are NOT_FOUND', async () => {
    expect(await call('/courses/7f1c1b8e-3f7a-4a8e-9a55-2f6b8c1d0e11')).toMatchObject({
      status: 404,
      body: { code: 'NOT_FOUND' }
    });
    expect(await call('/no-such-route')).toMatchObject({ status: 404, body: { code: 'NOT_FOUND' } });
  });

  it('malformed JSON is MALFORMED_JSON', async () => {
    const { status, body } = await call('/courses', { method: 'POST', body: '{"title":' });
    expect(status).toBe(400);
    expect(body).toMatchObject({ code: 'MALFORMED_JSON' });
  });

  it('submitting an incomplete course lists problem codes', async () => {
    const created = await call('/courses', {
      method: 'POST',
      body: JSON.stringify({ title: 'Empty course' })
    });
    expect(created.status).toBe(201);
    const { status, body } = await call(`/courses/${String(created.body.id)}/submit`, {
      method: 'POST'
    });
    expect(status).toBe(422);
    expect(body).toEqual({
      error: 'Course is incomplete',
      code: 'COURSE_INCOMPLETE',
      params: { problems: ['DESCRIPTION_REQUIRED', 'NO_MODULES'] }
    });
  });

  it('administrators cannot change their own role: SELF_CHANGE_FORBIDDEN', async () => {
    const { status, body } = await call(`/admin/users/${adminId}/role`, {
      method: 'PATCH',
      as: adminId,
      role: 'admin',
      body: JSON.stringify({ role: 'user' })
    });
    expect(status).toBe(403);
    expect(body).toMatchObject({ code: 'SELF_CHANGE_FORBIDDEN' });
  });

  it('paginated lists carry only the documented fields (no internal total column)', async () => {
    const { body } = await call('/admin/users', { as: adminId, role: 'admin' });
    expect(body).toMatchObject({ page: 1, pageSize: 20, total: 2 });
    const items = body.items as Record<string, unknown>[];
    expect(items).toHaveLength(2);
    for (const item of items) expect(item).not.toHaveProperty('total');
  });
});
