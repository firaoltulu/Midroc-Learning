import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/client';
import { authoringQuery } from '../../../shared/api/query-defaults';
import { authoringKeys, courseKeys, myCourseKeys } from '../../../shared/api/query-keys';
import type { QuestionInput } from './schemas';

/**
 * A published course's revision (reference/openapi.yaml: RevisionState, CourseRevision,
 * RevisionSaveResult). The proposed tree is loose on purpose: it is read back into the
 * working copy, which checks every field it uses.
 */

const revisionChoiceSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  isCorrect: z.boolean(),
});

const revisionQuestionSchema = z.object({
  id: z.string().optional(),
  prompt: z.string(),
  isMultiple: z.boolean(),
  points: z.number().int(),
  choices: z.array(revisionChoiceSchema),
});

export const revisionItemSchema = z.object({
  id: z.string().optional(),
  type: z.enum(['video', 'pdf', 'exam']),
  title: z.string(),
  youtubeVideoId: z.string().nullish(),
  youtubeTitle: z.string().nullish(),
  fileKey: z.string().nullish(),
  sizeBytes: z.number().int().nullish(),
  pageCount: z.number().int().nullish(),
  instructions: z.string().nullish(),
  passingScorePercent: z.number().int().nullish(),
  maxAttempts: z.number().int().nullish(),
  timeLimitMinutes: z.number().int().nullish(),
  questions: z.array(revisionQuestionSchema).optional(),
});

export const revisionModuleSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().default(''),
  items: z.array(revisionItemSchema),
});

export const courseRevisionSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  submittedAt: z.string(),
  data: z.object({
    course: z.record(z.string(), z.unknown()),
    modules: z.array(revisionModuleSchema).optional(),
  }),
});

export const revisionStateSchema = z.object({
  revision: courseRevisionSchema.nullable(),
  lastDecision: z
    .object({
      id: z.string(),
      status: z.enum(['approved', 'rejected']),
      reason: z.string().nullable(),
      reviewedAt: z.string().nullable(),
    })
    .nullable(),
});

export const revisionChangeSchema = z.object({
  kind: z.enum(['added', 'removed', 'moved', 'edited', 'reordered']),
  target: z.enum(['course', 'module', 'item']),
  title: z.string(),
  itemType: z.enum(['video', 'pdf', 'exam']).optional(),
  fields: z.array(z.string()).optional(),
  fromModule: z.string().optional(),
  toModule: z.string().optional(),
});

export const revisionSaveResultSchema = z.object({
  saved: z.boolean(),
  unchanged: z.boolean(),
  revision: courseRevisionSchema.nullable(),
  changes: z.array(revisionChangeSchema),
});

export type CourseRevision = z.infer<typeof courseRevisionSchema>;
export type RevisionState = z.infer<typeof revisionStateSchema>;
export type RevisionChange = z.infer<typeof revisionChangeSchema>;
export type RevisionSaveResult = z.infer<typeof revisionSaveResultSchema>;
export type RevisionModule = z.infer<typeof revisionModuleSchema>;

/** GET /courses/:id/revision: the pending revision (if any) and the last decision. */
export const revisionQueryOptions = (courseId: string) =>
  queryOptions({
    queryKey: authoringKeys.revision(courseId),
    queryFn: async ({ signal }) =>
      revisionStateSchema.parse(await apiRequest(`/courses/${courseId}/revision`, { signal })),
    ...authoringQuery,
  });

function useRefreshRevision(courseId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: authoringKeys.course(courseId) }),
      queryClient.invalidateQueries({ queryKey: myCourseKeys.all }),
      queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
    ]);
}

/** PUT /courses/:id/revision: major course fields plus the complete proposed tree. */
export function useSaveRevision(courseId: string) {
  const refresh = useRefreshRevision(courseId);
  return useMutation({
    mutationFn: async (input: RevisionInput) =>
      revisionSaveResultSchema.parse(
        await apiRequest(`/courses/${courseId}/revision`, { method: 'PUT', body: input }),
      ),
    onSettled: refresh,
    meta: { networkErrorToast: false },
  });
}

/** DELETE /courses/:id/revision: withdraw the changes waiting for review. */
export function useWithdrawRevision(courseId: string) {
  const refresh = useRefreshRevision(courseId);
  return useMutation({
    mutationFn: () => apiRequest<undefined>(`/courses/${courseId}/revision`, { method: 'DELETE' }),
    // Not awaited: the editor rebases its working copy before the refreshed revision arrives.
    onSettled: () => {
      void refresh();
    },
    meta: { networkErrorToast: false },
  });
}

/** PUT /courses/:id/revision body (RevisionInput): major course fields and the whole tree. */
export interface RevisionInput {
  course: {
    title: string;
    description: string;
    category: string | null;
    language: 'en' | 'am';
    outcomes: string[];
  };
  modules: RevisionTreeModule[];
}

export type RevisionTreeItem =
  | { id?: string; type: 'video'; title: string; url?: string; youtubeVideoId?: string }
  | { id?: string; type: 'pdf'; title: string; fileKey: string }
  | {
      id?: string;
      type: 'exam';
      title: string;
      instructions: string;
      passingScorePercent: number;
      maxAttempts: number | null;
      timeLimitMinutes: number | null;
      questions: QuestionInput[];
    };

export interface RevisionTreeModule {
  id?: string;
  title: string;
  description: string;
  items: RevisionTreeItem[];
}
