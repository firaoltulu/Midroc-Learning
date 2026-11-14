import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { courseDetail, overview, topCourses } from '../src/modules/analytics/analytics.service.js';
import { createPgliteDatabase } from './harness/pglite.js';

const ownerId = 'c5c53f56-bb74-4cd7-98c4-a6bbb9ac7e68';
const doneId = 'f73bd0d1-1f30-4d55-ae72-e70e01465f30';
const halfId = '0b9a0d3e-2f0e-4c1c-9a57-6a3f8a1d2b11';
const courseId = 'c8929b64-76d2-4799-af60-09d35e314f60';
const moduleId = 'a2aa2739-dd1a-47cb-bc56-af0032663924';
const pdfId = '568ae546-461e-49ce-95f9-f0c9d91ee6b2';
const examId = 'f1279187-dba8-41b8-8ba0-9c2a61e37323';

describe('admin analytics figures', () => {
  let closeDatabase: (() => Promise<void>) | undefined;

  afterEach(async () => {
    setDatabaseForTests(undefined);
    await closeDatabase?.();
    closeDatabase = undefined;
  });

  it('dashboard totals, completion rates, progress buckets and per-item figures', async () => {
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
      `INSERT INTO users (id, firebase_uid, email) VALUES
       ($1, 'owner', 'owner@example.test'), ($2, 'done', 'done@example.test'),
       ($3, 'half', 'half@example.test')`,
      [ownerId, doneId, halfId]
    );
    await db.query(
      `INSERT INTO courses (id, owner_id, title, status) VALUES ($1, $2, 'Metrics', 'published')`,
      [courseId, ownerId]
    );
    await db.query(`INSERT INTO courses (owner_id, title) VALUES ($1, 'Draft one')`, [ownerId]);
    await db.query(
      `INSERT INTO modules (id, course_id, title, position) VALUES ($1, $2, 'Basics', 0)`,
      [moduleId, courseId]
    );
    await db.query(
      `INSERT INTO module_items (id, module_id, type, title, position) VALUES
       ($1, $3, 'pdf', 'Handbook', 0), ($2, $3, 'exam', 'Quiz', 1)`,
      [pdfId, examId, moduleId]
    );
    await db.query(`INSERT INTO exams (item_id) VALUES ($1)`, [examId]);
    await db.query(
      `INSERT INTO enrollments (user_id, course_id) VALUES ($1, $3), ($2, $3)`,
      [doneId, halfId, courseId]
    );
    await db.query(
      `INSERT INTO item_progress (user_id, item_id, completed_at) VALUES
       ($1, $3, now()), ($1, $4, now()), ($2, $3, now())`,
      [doneId, halfId, pdfId, examId]
    );
    await db.query(
      `INSERT INTO exam_attempts (user_id, exam_id, submitted_at, score_percent, passed) VALUES
       ($1, $3, now(), 90, true), ($2, $3, now(), 40, false)`,
      [doneId, halfId, examId]
    );

    expect(await overview()).toMatchObject({
      enrollmentCount: 2,
      enrollmentsLast30Days: 2,
      activeLearnerCount: 2,
      pendingRevisionCount: 0,
      coursesByStatus: { draft: 1, pending_review: 0, published: 1, rejected: 0, archived: 0 }
    });
    expect(Number((await overview()).examPassRate)).toBe(50);

    const [top] = await topCourses();
    expect(top).toMatchObject({ id: courseId, enrollmentCount: 2, completedCount: 1 });
    expect(Number(top?.completionRate)).toBe(50);

    const detail = await courseDetail(courseId);
    expect(detail).toMatchObject({ completedEnrollmentCount: 1, completionRate: 50 });
    expect(Number(detail.examPassRate)).toBe(50);
    expect(detail.progressDistribution.map((bucket) => bucket.count)).toEqual([0, 0, 0, 1, 0, 1]);
    expect(detail.items).toMatchObject([
      { id: pdfId, type: 'pdf', moduleTitle: 'Basics', completedCount: 2, passRate: null },
      { id: examId, type: 'exam', completedCount: 1, submittedAttemptCount: 2 }
    ]);
    expect(Number((detail.items[1] as { averageScore: unknown }).averageScore)).toBe(65);
  });
});
