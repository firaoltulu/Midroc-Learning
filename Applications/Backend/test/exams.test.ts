import { readFile } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import { db, setDatabaseForTests } from '../src/core/db/pool.js';
import { Conflict, Gone } from '../src/core/http/app-error.js';
import { getExam, startAttempt, submitAttempt } from '../src/modules/exams/exams.service.js';
import { createPgliteDatabase } from './harness/pglite.js';

const ownerId = 'c5c53f56-bb74-4cd7-98c4-a6bbb9ac7e68';
const learnerId = 'f73bd0d1-1f30-4d55-ae72-e70e01465f30';
const courseId = 'c8929b64-76d2-4799-af60-09d35e314f60';
const moduleId = 'a2aa2739-dd1a-47cb-bc56-af0032663924';
const examId = '568ae546-461e-49ce-95f9-f0c9d91ee6b2';
const questionId = 'f1279187-dba8-41b8-8ba0-9c2a61e37323';
const correctChoiceId = '06354d62-2e96-47a6-a2a5-2155a298a4e1';
const wrongChoiceId = 'c2dc172c-fc0f-429f-8987-15f2db2fb0c2';

describe('exam attempts', () => {
  let closeDatabase: (() => Promise<void>) | undefined;

  afterEach(async () => {
    setDatabaseForTests(undefined);
    await closeDatabase?.();
    closeDatabase = undefined;
  });

  async function setup(timeLimitMinutes: number | null = null) {
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
       ($1, 'owner-firebase', 'owner@example.test'),
       ($2, 'learner-firebase', 'learner@example.test')`,
      [ownerId, learnerId]
    );
    await db.query(
      `INSERT INTO courses (id, owner_id, title, status) VALUES ($1, $2, 'Exam course', 'published')`,
      [courseId, ownerId]
    );
    await db.query(
      `INSERT INTO modules (id, course_id, title, position) VALUES ($1, $2, 'Module', 0)`,
      [moduleId, courseId]
    );
    await db.query(
      `INSERT INTO module_items (id, module_id, type, title, position)
       VALUES ($1, $2, 'exam', 'Exam', 0)`,
      [examId, moduleId]
    );
    await db.query(
      `INSERT INTO exams (item_id, passing_score_percent, max_attempts, time_limit_minutes)
       VALUES ($1, 100, 1, $2)`,
      [examId, timeLimitMinutes]
    );
    await db.query(
      `INSERT INTO exam_questions (id, exam_id, prompt, position)
       VALUES ($1, $2, 'Which answer is correct?', 0)`,
      [questionId, examId]
    );
    await db.query(
      `INSERT INTO exam_choices (id, question_id, text, is_correct, position) VALUES
       ($1, $3, 'Correct', true, 0), ($2, $3, 'Wrong', false, 1)`,
      [correctChoiceId, wrongChoiceId, questionId]
    );
    await db.query(
      'INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)',
      [learnerId, courseId]
    );
    return { actor: { id: learnerId, role: 'user' as const } };
  }

  it('does not expose answers before submission and completes the item on passing', async () => {
    const { actor } = await setup();
    const exam = await getExam(examId, actor);
    expect(JSON.stringify(exam)).not.toContain('isCorrect');
    expect(JSON.stringify(exam)).not.toContain('is_correct');

    // The overview shows the learner's standing, not the questions.
    expect(exam).not.toHaveProperty('questions');
    expect(exam).toMatchObject({
      questionCount: 1,
      attemptsUsed: 0,
      attemptsRemaining: 1,
      passed: false,
      hasOpenAttempt: false
    });

    const attempt = await startAttempt(examId, actor);
    expect(attempt).toMatchObject({ resumed: false, questions: [{ id: questionId }] });
    const again = await startAttempt(examId, actor);
    expect(again).toMatchObject({ attemptId: attempt.attemptId, resumed: true });

    const result = await submitAttempt(attempt.attemptId, actor, [
      { questionId, choiceIds: [correctChoiceId] }
    ]);
    expect(result).toMatchObject({
      passed: true,
      scorePercent: 100,
      attemptsUsed: 1,
      attemptsRemaining: 0,
      revealAnswers: true,
      results: [{ questionId, isCorrect: true, correctChoiceIds: [correctChoiceId] }]
    });
    const { rows } = await db.query<{ completed: boolean }>(
      `SELECT completed_at IS NOT NULL AS completed FROM item_progress
       WHERE user_id = $1 AND item_id = $2`,
      [learnerId, examId]
    );
    expect(rows[0]?.completed).toBe(true);
    await expect(startAttempt(examId, actor)).rejects.toBeInstanceOf(Conflict);
  });

  it('commits a late zero-score result before returning 410', async () => {
    const { actor } = await setup(1);
    const attempt = await startAttempt(examId, actor);
    await db.query(
      `UPDATE exam_attempts SET started_at = now() - interval '2 minutes' WHERE id = $1`,
      [attempt.attemptId]
    );
    await expect(
      submitAttempt(attempt.attemptId, actor, [{ questionId, choiceIds: [correctChoiceId] }])
    ).rejects.toBeInstanceOf(Gone);
    const { rows } = await db.query<{ scorePercent: number; passed: boolean; submitted: boolean }>(
      `SELECT score_percent AS "scorePercent", passed,
       submitted_at IS NOT NULL AS submitted FROM exam_attempts WHERE id = $1`,
      [attempt.attemptId]
    );
    expect(Number(rows[0]?.scorePercent)).toBe(0);
    expect(rows[0]).toMatchObject({ passed: false, submitted: true });
  });

  it('flags submissions at the exact timeout boundary as late', async () => {
    const { actor } = await setup(1);
    const attempt = await startAttempt(examId, actor);
    await db.query(
      `UPDATE exam_attempts SET started_at = now() - interval '1 minute 30 seconds' WHERE id = $1`,
      [attempt.attemptId]
    );

    await expect(
      submitAttempt(attempt.attemptId, actor, [{ questionId, choiceIds: [correctChoiceId] }])
    ).rejects.toBeInstanceOf(Gone);
  });
});
