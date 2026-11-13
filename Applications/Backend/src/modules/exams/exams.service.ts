import type { Actor } from '../../core/actor.js';
import { db, type Queryable } from '../../core/db/pool.js';
import { withTx } from '../../core/db/tx.js';
import { Conflict, Gone, NotFound, BadRequest } from '../../core/http/app-error.js';
import { markItemComplete } from '../enrollments/index.js';
import * as repository from './exams.repository.js';
import type { ExamQuestionInput } from './exams.schemas.js';

function assertCanView(
  context: NonNullable<Awaited<ReturnType<typeof repository.getContext>>>,
  actor: Actor
): void {
  if (
    context.status !== 'published' ||
    (context.ownerId !== actor.id && actor.role !== 'admin' && !context.enrolled)
  ) {
    throw new NotFound('Exam not found');
  }
}

function assertCanAttempt(
  context: NonNullable<Awaited<ReturnType<typeof repository.getContext>>>,
  actor: Actor
): void {
  if (context.status !== 'published' || !context.enrolled || context.ownerId === actor.id) {
    throw new NotFound('Exam not found');
  }
}

export async function getExam(examId: string, actor: Actor) {
  const context = await repository.getContext(db, examId, actor.id);
  if (!context) throw new NotFound('Exam not found');
  assertCanView(context, actor);
  const exam = await repository.getExam(db, examId);
  if (!exam) throw new NotFound('Exam not found');
  // Questions are only sent once an attempt starts.
  const standing = await repository.learnerStanding(db, actor.id, examId);
  return {
    ...exam,
    questionCount: standing.questionCount,
    attemptsUsed: standing.attemptsUsed,
    attemptsRemaining: remainingAttempts(exam.maxAttempts, standing.attemptsUsed),
    passed: standing.passed,
    hasOpenAttempt: standing.openAttemptId !== null
  };
}

/** Null when attempts are unlimited. */
function remainingAttempts(maxAttempts: number | null, used: number): number | null {
  return maxAttempts === null ? null : Math.max(0, maxAttempts - used);
}

export async function startAttempt(examId: string, actor: Actor) {
  const outcome = await withTx(async (tx) => {
    const context = await repository.getContext(tx, examId, actor.id);
    if (!context) throw new NotFound('Exam not found');
    assertCanAttempt(context, actor);
    await repository.lockUserExamAttempt(tx, actor.id, examId);
    const now = Date.now();
    let attempt = await repository.openAttempt(tx, actor.id, examId);
    if (
      attempt &&
      context.timeLimitMinutes !== null &&
      now >= new Date(attempt.startedAt).getTime() + context.timeLimitMinutes * 60_000 + 30_000
    ) {
      await repository.closeTimedOutAttempt(tx, attempt.id);
      attempt = undefined;
      const attempts = await repository.attemptCount(tx, actor.id, examId);
      if (context.maxAttempts !== null && attempts >= context.maxAttempts) {
        return { kind: 'exhausted' as const };
      }
    }
    const attempts = await repository.attemptCount(tx, actor.id, examId);
    if (!attempt && context.maxAttempts !== null && attempts >= context.maxAttempts) {
      return { kind: 'exhausted' as const };
    }
    const resumed = attempt !== undefined;
    if (!attempt) attempt = await repository.insertAttempt(tx, actor.id, examId);
    const questions = await repository.learnerQuestions(tx, examId);
    return {
      kind: 'active' as const,
      attempt,
      resumed,
      questions,
      timeLimitMinutes: context.timeLimitMinutes
    };
  });
  if (outcome.kind === 'exhausted') {
    throw new Conflict('No attempts remaining', 'ATTEMPTS_EXHAUSTED');
  }
  const expiresAt = outcome.timeLimitMinutes === null
    ? null
    : new Date(new Date(outcome.attempt.startedAt).getTime() + outcome.timeLimitMinutes * 60_000);
  return {
    attemptId: outcome.attempt.id,
    resumed: outcome.resumed,
    startedAt: outcome.attempt.startedAt,
    expiresAt,
    questions: outcome.questions
  };
}

export async function submitAttempt(
  attemptId: string,
  actor: Actor,
  answers: Array<{ questionId: string; choiceIds: string[] }>
) {
  const outcome = await withTx(async (tx) => {
    const attempt = await repository.getAttemptForUpdate(tx, attemptId);
    if (!attempt || attempt.userId !== actor.id) throw new NotFound('Attempt not found');
    if (attempt.submittedAt) throw new Conflict('Attempt has already been submitted', 'ATTEMPT_ALREADY_SUBMITTED');
    const context = await repository.getContext(tx, attempt.examId, actor.id);
    if (!context) throw new NotFound('Exam not found');
    const questions = await repository.currentQuestionsForGrading(tx, attempt.examId);
    const questionMap = new Map(questions.map((question) => [question.id, question]));
    const selected = new Map<string, Set<string>>();

    for (const answer of answers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;
      const selectedForQuestion = selected.get(answer.questionId) ?? new Set<string>();
      for (const choiceId of answer.choiceIds) {
        if (!question.choices.some((choice) => choice.id === choiceId)) {
          throw new BadRequest('Choice does not belong to the question', 'INVALID_CHOICE');
        }
        selectedForQuestion.add(choiceId);
      }
      if (!question.isMultiple && selectedForQuestion.size > 1) {
        throw new BadRequest('Single-answer questions accept only one choice', 'SINGLE_ANSWER_ONLY');
      }
      selected.set(answer.questionId, selectedForQuestion);
    }

    const now = Date.now();
    const isLate =
      context.timeLimitMinutes !== null &&
      now >= new Date(attempt.startedAt).getTime() + context.timeLimitMinutes * 60_000 + 30_000;
    await repository.saveAnswers(
      tx,
      attempt.id,
      [...selected.entries()].map(([questionId, choiceIds]) => ({
        questionId,
        choiceIds: [...choiceIds]
      }))
    );
    if (isLate) {
      await repository.finishAttempt(tx, attempt.id, 0, false);
      return { kind: 'late' as const };
    }

    let possiblePoints = 0;
    let earnedPoints = 0;
    const results = questions.map((question) => {
      const correctChoiceIds = question.choices
        .filter((choice) => choice.isCorrect)
        .map((choice) => choice.id);
      const selectedChoiceIds = [...(selected.get(question.id) ?? new Set<string>())];
      const correct =
        selectedChoiceIds.length === correctChoiceIds.length &&
        selectedChoiceIds.every((id) => correctChoiceIds.includes(id));
      possiblePoints += question.points;
      if (correct) earnedPoints += question.points;
      return { questionId: question.id, isCorrect: correct, selectedChoiceIds, correctChoiceIds };
    });
    const scorePercent = possiblePoints === 0
      ? 0
      : Math.round((earnedPoints / possiblePoints) * 10_000) / 100;
    const passed = scorePercent >= context.passingScorePercent;
    await repository.finishAttempt(tx, attempt.id, scorePercent, passed);
    if (passed) await markItemComplete(tx, actor.id, attempt.examId);
    const attemptCount = await repository.attemptCount(tx, actor.id, attempt.examId);
    const revealAnswers =
      passed ||
      (context.maxAttempts !== null && attemptCount >= context.maxAttempts);
    return {
      kind: 'submitted' as const,
      scorePercent,
      passed,
      attemptsUsed: attemptCount,
      attemptsRemaining: remainingAttempts(context.maxAttempts, attemptCount),
      revealAnswers,
      results: results.map(({ correctChoiceIds, ...result }) => ({
        ...result,
        ...(revealAnswers ? { correctChoiceIds } : {})
      }))
    };
  });
  if (outcome.kind === 'late') throw new Gone('Exam time exceeded', 'EXAM_TIME_EXCEEDED');
  const { scorePercent, passed, attemptsUsed, attemptsRemaining, revealAnswers, results } = outcome;
  return { scorePercent, passed, attemptsUsed, attemptsRemaining, revealAnswers, results };
}

export async function listAttempts(examId: string, actor: Actor) {
  const context = await repository.getContext(db, examId, actor.id);
  if (!context) throw new NotFound('Exam not found');
  assertCanAttempt(context, actor);
  return repository.attemptHistory(db, actor.id, examId);
}

export async function createExam(
  queryable: Queryable,
  itemId: string,
  settings: Parameters<typeof repository.createExam>[2]
): Promise<void> {
  await repository.createExam(queryable, itemId, settings);
}

export async function replaceQuestions(
  queryable: Queryable,
  examId: string,
  questions: ExamQuestionInput[]
): Promise<void> {
  try {
    await repository.replaceQuestions(queryable, examId, questions);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Stale')) {
      throw new Conflict('Exam question references are stale', 'STALE_REVISION');
    }
    throw error;
  }
}

export async function applyQuestions(
  queryable: Queryable,
  examId: string,
  questions: ExamQuestionInput[]
): Promise<void> {
  return replaceQuestions(queryable, examId, questions);
}

export async function loadQuestionsForAuthoring(queryable: Queryable, examId: string) {
  return repository.loadQuestionsForAuthoring(queryable, examId);
}
