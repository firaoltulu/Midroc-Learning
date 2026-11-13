import type { Queryable } from '../../core/db/pool.js';
import type { ExamQuestionInput } from './exams.schemas.js';

export async function lockUserExamAttempt(db: Queryable, userId: string, examId: string): Promise<void> {
  await db.query(
    `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
    [`${userId}:${examId}`]
  );
}

export type ExamContext = {
  examId: string;
  passingScorePercent: number;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
  ownerId: string;
  status: string;
  enrolled: boolean;
};

export async function getContext(db: Queryable, examId: string, userId: string): Promise<ExamContext | undefined> {
  const { rows } = await db.query<ExamContext>(
    `SELECT e.item_id AS "examId", e.passing_score_percent AS "passingScorePercent",
       e.max_attempts AS "maxAttempts", e.time_limit_minutes AS "timeLimitMinutes",
       c.owner_id AS "ownerId", c.status,
       EXISTS (SELECT 1 FROM enrollments en WHERE en.user_id = $2 AND en.course_id = c.id) AS enrolled
     FROM exams e JOIN module_items i ON i.id = e.item_id
     JOIN modules m ON m.id = i.module_id
     JOIN courses c ON c.id = m.course_id
     WHERE e.item_id = $1`,
    [examId, userId]
  );
  return rows[0];
}

export async function getExam(db: Queryable, examId: string): Promise<{
  instructions: string;
  passingScorePercent: number;
  maxAttempts: number | null;
  timeLimitMinutes: number | null;
} | undefined> {
  const { rows } = await db.query<{
    instructions: string;
    passingScorePercent: number;
    maxAttempts: number | null;
    timeLimitMinutes: number | null;
  }>(
    `SELECT instructions, passing_score_percent AS "passingScorePercent",
       max_attempts AS "maxAttempts", time_limit_minutes AS "timeLimitMinutes"
     FROM exams WHERE item_id = $1`,
    [examId]
  );
  return rows[0];
}

export async function learnerQuestions(db: Queryable, examId: string): Promise<unknown[]> {
  const { rows } = await db.query<{
    id: string;
    prompt: string;
    isMultiple: boolean;
    points: number;
    position: number;
  }>(
    `SELECT id, prompt, is_multiple AS "isMultiple", points, position
     FROM exam_questions WHERE exam_id = $1 ORDER BY position`,
    [examId]
  );
  const questions: unknown[] = [];
  for (const question of rows) {
    const { rows: choices } = await db.query(
      `SELECT id, text, position FROM exam_choices
       WHERE question_id = $1 ORDER BY position`,
      [question.id]
    );
    questions.push({ ...question, choices });
  }
  return questions;
}

export async function openAttempt(db: Queryable, userId: string, examId: string) {
  const { rows } = await db.query<{ id: string; startedAt: Date }>(
    `SELECT id, started_at AS "startedAt" FROM exam_attempts
     WHERE user_id = $1 AND exam_id = $2 AND submitted_at IS NULL
     ORDER BY started_at DESC LIMIT 1 FOR UPDATE`,
    [userId, examId]
  );
  return rows[0];
}

/** The viewer's standing on an exam, for the overview shown before starting. */
export async function learnerStanding(
  db: Queryable,
  userId: string,
  examId: string
): Promise<{ questionCount: number; attemptsUsed: number; passed: boolean; openAttemptId: string | null }> {
  const { rows } = await db.query<{
    questionCount: number;
    attemptsUsed: number;
    passed: boolean;
    openAttemptId: string | null;
  }>(
    `SELECT
       (SELECT count(*)::int FROM exam_questions q WHERE q.exam_id = $2) AS "questionCount",
       (SELECT count(*)::int FROM exam_attempts a WHERE a.user_id = $1 AND a.exam_id = $2)
         AS "attemptsUsed",
       EXISTS (SELECT 1 FROM exam_attempts a
         WHERE a.user_id = $1 AND a.exam_id = $2 AND a.passed) AS passed,
       (SELECT a.id FROM exam_attempts a
         WHERE a.user_id = $1 AND a.exam_id = $2 AND a.submitted_at IS NULL
         ORDER BY a.started_at DESC LIMIT 1) AS "openAttemptId"`,
    [userId, examId]
  );
  return rows[0]!;
}

export async function attemptCount(db: Queryable, userId: string, examId: string): Promise<number> {
  const { rows } = await db.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM exam_attempts WHERE user_id = $1 AND exam_id = $2',
    [userId, examId]
  );
  return rows[0]?.count ?? 0;
}

export async function closeTimedOutAttempt(db: Queryable, attemptId: string): Promise<void> {
  await db.query(
    `UPDATE exam_attempts SET submitted_at = now(), score_percent = 0, passed = false
     WHERE id = $1 AND submitted_at IS NULL`,
    [attemptId]
  );
}

export async function insertAttempt(db: Queryable, userId: string, examId: string) {
  const { rows } = await db.query<{ id: string; startedAt: Date }>(
    `INSERT INTO exam_attempts (user_id, exam_id) VALUES ($1, $2)
     RETURNING id, started_at AS "startedAt"`,
    [userId, examId]
  );
  return rows[0]!;
}

export async function getAttemptForUpdate(db: Queryable, attemptId: string) {
  const { rows } = await db.query<{
    id: string;
    examId: string;
    userId: string;
    startedAt: Date;
    submittedAt: Date | null;
  }>(
    `SELECT id, exam_id AS "examId", user_id AS "userId",
       started_at AS "startedAt", submitted_at AS "submittedAt"
     FROM exam_attempts WHERE id = $1 FOR UPDATE`,
    [attemptId]
  );
  return rows[0];
}

export async function currentQuestionsForGrading(db: Queryable, examId: string) {
  const { rows } = await db.query<{
    id: string;
    prompt: string;
    points: number;
    position: number;
    isMultiple: boolean;
  }>(
    `SELECT id, prompt, points, position, is_multiple AS "isMultiple"
     FROM exam_questions WHERE exam_id = $1 ORDER BY position`,
    [examId]
  );
  const questions = [];
  for (const question of rows) {
    const { rows: choices } = await db.query<{
      id: string;
      text: string;
      isCorrect: boolean;
    }>(
      `SELECT id, text, is_correct AS "isCorrect" FROM exam_choices
       WHERE question_id = $1 ORDER BY position`,
      [question.id]
    );
    questions.push({ ...question, choices });
  }
  return questions;
}

export async function saveAnswers(
  db: Queryable,
  attemptId: string,
  answers: Array<{ questionId: string; choiceIds: string[] }>
): Promise<void> {
  for (const answer of answers) {
    for (const choiceId of answer.choiceIds) {
      await db.query(
        `INSERT INTO exam_attempt_answers (attempt_id, question_id, choice_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [attemptId, answer.questionId, choiceId]
      );
    }
  }
}

export async function finishAttempt(
  db: Queryable,
  attemptId: string,
  scorePercent: number,
  passed: boolean
): Promise<void> {
  await db.query(
    `UPDATE exam_attempts SET submitted_at = now(), score_percent = $2, passed = $3
     WHERE id = $1 AND submitted_at IS NULL`,
    [attemptId, scorePercent, passed]
  );
}

export async function attemptHistory(db: Queryable, userId: string, examId: string): Promise<unknown[]> {
  const { rows } = await db.query(
    `SELECT id, started_at AS "startedAt", submitted_at AS "submittedAt",
       score_percent AS "scorePercent", passed
     FROM exam_attempts WHERE user_id = $1 AND exam_id = $2
     ORDER BY started_at DESC`,
    [userId, examId]
  );
  return rows;
}

export async function createExam(
  db: Queryable,
  itemId: string,
  settings: { instructions?: string; passingScorePercent?: number; maxAttempts?: number | null; timeLimitMinutes?: number | null }
): Promise<void> {
  await db.query(
    `INSERT INTO exams (item_id, instructions, passing_score_percent, max_attempts, time_limit_minutes)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      itemId,
      settings.instructions ?? '',
      settings.passingScorePercent ?? 60,
      settings.maxAttempts ?? null,
      settings.timeLimitMinutes ?? null
    ]
  );
}

export async function replaceQuestions(
  db: Queryable,
  examId: string,
  questions: ExamQuestionInput[]
): Promise<void> {
  const { rows: existingQuestions } = await db.query<{ id: string }>(
    'SELECT id FROM exam_questions WHERE exam_id = $1',
    [examId]
  );
  const questionIds = new Set(existingQuestions.map((question) => question.id));
  const seenQuestionIds = new Set<string>();
  const existingChoiceIds = new Set<string>();
  const newQuestionIds = questions.flatMap((question) => (question.id ? [question.id] : []));
  if (new Set(newQuestionIds).size !== newQuestionIds.length) throw new Error('Duplicate question id');
  for (const id of newQuestionIds) {
    if (!questionIds.has(id)) throw new Error('Stale question id');
    seenQuestionIds.add(id);
  }
  if (seenQuestionIds.size !== newQuestionIds.length) throw new Error('Duplicate question id');
  for (const question of existingQuestions) {
    const { rows: choices } = await db.query<{ id: string }>(
      'SELECT id FROM exam_choices WHERE question_id = $1',
      [question.id]
    );
    for (const choice of choices) existingChoiceIds.add(choice.id);
  }
  const requestedChoiceIds = questions.flatMap((question) =>
    question.choices.flatMap((choice) => (choice.id ? [choice.id] : []))
  );
  if (new Set(requestedChoiceIds).size !== requestedChoiceIds.length) throw new Error('Duplicate choice id');
  for (const id of requestedChoiceIds) {
    if (!existingChoiceIds.has(id)) throw new Error('Stale choice id');
  }

  const keptQuestionIds = new Set<string>();
  for (const [position, question] of questions.entries()) {
    let questionId = question.id;
    if (questionId) {
      await db.query(
        `UPDATE exam_questions SET prompt = $2, is_multiple = $3, points = $4, position = $5
         WHERE id = $1`,
        [questionId, question.prompt, question.isMultiple, question.points, position]
      );
    } else {
      const { rows } = await db.query<{ id: string }>(
        `INSERT INTO exam_questions (exam_id, prompt, is_multiple, points, position)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [examId, question.prompt, question.isMultiple, question.points, position]
      );
      questionId = rows[0]!.id;
    }
    keptQuestionIds.add(questionId);
    const keptChoiceIds = new Set<string>();
    for (const [choicePosition, choice] of question.choices.entries()) {
      if (choice.id) {
        await db.query(
          `UPDATE exam_choices SET question_id = $2, text = $3, is_correct = $4, position = $5
           WHERE id = $1`,
          [choice.id, questionId, choice.text, choice.isCorrect, choicePosition]
        );
        keptChoiceIds.add(choice.id);
      } else {
        const { rows } = await db.query<{ id: string }>(
          `INSERT INTO exam_choices (question_id, text, is_correct, position)
           VALUES ($1, $2, $3, $4) RETURNING id`,
          [questionId, choice.text, choice.isCorrect, choicePosition]
        );
        keptChoiceIds.add(rows[0]!.id);
      }
    }
    const { rows: oldChoices } = await db.query<{ id: string }>(
      'SELECT id FROM exam_choices WHERE question_id = $1',
      [questionId]
    );
    for (const oldChoice of oldChoices) {
      if (!keptChoiceIds.has(oldChoice.id)) await db.query('DELETE FROM exam_choices WHERE id = $1', [oldChoice.id]);
    }
  }
  for (const question of existingQuestions) {
    if (!keptQuestionIds.has(question.id)) {
      await db.query('DELETE FROM exam_questions WHERE id = $1', [question.id]);
    }
  }
}

export async function loadQuestionsForAuthoring(db: Queryable, examId: string) {
  return currentQuestionsForGrading(db, examId);
}
