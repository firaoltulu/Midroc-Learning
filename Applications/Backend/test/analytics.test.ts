import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { Unprocessable } from '../src/core/http/app-error.js';
import { enrollmentSeries, overview } from '../src/modules/analytics/analytics.service.js';
import { createPgliteDatabase } from './harness/pglite.js';

describe('analytics queries', () => {
  let closeDatabase: (() => Promise<void>) | undefined;

  afterEach(async () => {
    setDatabaseForTests(undefined);
    await closeDatabase?.();
    closeDatabase = undefined;
  });

  it('returns a UTC zero-filled series and enforces the 400-day cap', async () => {
    const pglite = createPgliteDatabase();
    closeDatabase = pglite.close;
    setDatabaseForTests(pglite.database);
    for (const migration of [
      '001_init.sql',
      '002_course_content.sql',
      '003_youtube_video.sql',
      '004_course_language.sql'
    ]) {
      await pglite.engine.exec(await readFile(`migrations/${migration}`, 'utf8'));
    }
    const userId = 'c5c53f56-bb74-4cd7-98c4-a6bbb9ac7e68';
    const courseId = 'c8929b64-76d2-4799-af60-09d35e314f60';
    const secondUser = 'f73bd0d1-1f30-4d55-ae72-e70e01465f30';
    await db.query(
      `INSERT INTO users (id, firebase_uid, email) VALUES
       ($1, 'user-one', 'one@example.test'), ($2, 'user-two', 'two@example.test')`,
      [userId, secondUser]
    );
    await db.query(
      `INSERT INTO courses (id, owner_id, title) VALUES ($1, $2, 'Metrics')`,
      [courseId, userId]
    );
    await db.query(
      `INSERT INTO enrollments (user_id, course_id, enrolled_at) VALUES
       ($1, $3, '2026-10-01T10:00:00Z'),
       ($2, $3, '2026-10-03T10:00:00Z')`,
      [userId, secondUser, courseId]
    );
    const series = await enrollmentSeries({
      from: '2026-10-01',
      to: '2026-10-03',
      interval: 'day'
    });
    expect(series).toHaveLength(3);
    expect(series.map((bucket) => bucket.count)).toEqual([1, 0, 1]);
    await expect(
      enrollmentSeries({ from: '2025-01-01', to: '2026-02-05', interval: 'day' })
    ).rejects.toBeInstanceOf(Unprocessable);
    expect(await overview()).toMatchObject({ enrollmentCount: 2 });
  });
});
