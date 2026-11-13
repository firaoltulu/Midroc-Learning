import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest, apiRequestWithMeta } from '../../../shared/api/client';
import { examQuery } from '../../../shared/api/query-defaults';
import { courseKeys, enrollmentKeys, examKeys } from '../../../shared/api/query-keys';
import { clockOffset } from '../model/exam-timer';

/** Exam responses (reference/openapi.yaml: ExamOverview, ExamStart, ExamResult, Attempt). */

export const examOverviewSchema = z.object({
  instructions: z.string(),
  passingScorePercent: z.number(),
  maxAttempts: z.number().int().nullable(),
  timeLimitMinutes: z.number().int().nullable(),
  questionCount: z.number().int(),
  attemptsUsed: z.number().int(),
  attemptsRemaining: z.number().int().nullable(),
  passed: z.boolean(),
  hasOpenAttempt: z.boolean(),
});

export const examQuestionSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  isMultiple: z.boolean(),
  points: z.number().int(),
  position: z.number().int(),
  choices: z.array(z.object({ id: z.string(), text: z.string(), position: z.number().int() })),
});

export const examStartSchema = z.object({
  attemptId: z.string(),
  resumed: z.boolean(),
  startedAt: z.string(),
  expiresAt: z.string().nullable(),
  questions: z.array(examQuestionSchema),
});

export const examResultSchema = z.object({
  scorePercent: z.number(),
  passed: z.boolean(),
  attemptsUsed: z.number().int(),
  attemptsRemaining: z.number().int().nullable(),
  revealAnswers: z.boolean(),
  results: z.array(
    z.object({
      questionId: z.string(),
      isCorrect: z.boolean(),
      selectedChoiceIds: z.array(z.string()),
      correctChoiceIds: z.array(z.string()).optional(),
    }),
  ),
});

export const attemptSchema = z.object({
  id: z.string(),
  startedAt: z.string(),
  submittedAt: z.string().nullable(),
  scorePercent: z.number().nullable(),
  passed: z.boolean().nullable(),
});

export type ExamOverview = z.infer<typeof examOverviewSchema>;
export type ExamQuestion = z.infer<typeof examQuestionSchema>;
export type ExamResult = z.infer<typeof examResultSchema>;
export type Attempt = z.infer<typeof attemptSchema>;

/** A started attempt plus the server clock offset for the timer. */
export type ExamSession = z.infer<typeof examStartSchema> & { clockOffset: number };

export const examOverviewQueryOptions = (examId: string) =>
  queryOptions({
    queryKey: examKeys.detail(examId),
    queryFn: async ({ signal }) =>
      examOverviewSchema.parse(await apiRequest(`/exams/${examId}`, { signal })),
    ...examQuery,
  });

export const attemptsQueryOptions = (examId: string) =>
  queryOptions({
    queryKey: examKeys.attempts(examId),
    queryFn: async ({ signal }) =>
      z.array(attemptSchema).parse(await apiRequest(`/exams/${examId}/attempts`, { signal })),
    ...examQuery,
  });

/** POST /exams/:id/start: a new attempt, or the open one (`resumed`). */
export function useStartExam(examId: string) {
  return useMutation({
    mutationFn: async (): Promise<ExamSession> => {
      const { data, headers, receivedAt } = await apiRequestWithMeta(`/exams/${examId}/start`, {
        method: 'POST',
      });
      return {
        ...examStartSchema.parse(data),
        clockOffset: clockOffset(headers.get('Date'), receivedAt),
      };
    },
    // The exam screen shows its own connection error next to the button.
    meta: { networkErrorToast: false },
  });
}

/**
 * POST /attempts/:id/submit. Afterwards the overview, history, course outline (passing
 * completes the item) and My learning are refreshed, whatever the outcome.
 */
export function useSubmitExam(courseId: string, examId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      attemptId: string;
      answers: { questionId: string; choiceIds: string[] }[];
    }) =>
      examResultSchema.parse(
        await apiRequest(`/attempts/${input.attemptId}/submit`, {
          method: 'POST',
          body: { answers: input.answers },
        }),
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: examKeys.detail(examId) }),
        queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
        queryClient.invalidateQueries({ queryKey: enrollmentKeys.all }),
      ]),
    meta: { networkErrorToast: false },
  });
}
