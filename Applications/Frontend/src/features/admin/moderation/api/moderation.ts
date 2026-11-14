import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../../shared/api/client';
import { authoringQuery, listQuery } from '../../../../shared/api/query-defaults';
import {
  adminKeys,
  authoringKeys,
  courseKeys,
  myCourseKeys,
} from '../../../../shared/api/query-keys';
import { courseDetailSchema, itemTypeSchema } from '../../../courses';
import { adminCourseSchema } from '../../courses';

/** GET /admin/moderation (reference/openapi.yaml: ModerationQueue), oldest first. */
export const moderationQueueSchema = z.object({
  courses: z.array(adminCourseSchema),
  revisions: z.array(
    z.object({
      id: z.string(),
      courseId: z.string(),
      courseTitle: z.string(),
      ownerId: z.string(),
      ownerName: z.string().nullable(),
      submittedBy: z.string(),
      submittedAt: z.string(),
    }),
  ),
});

export type ModerationQueue = z.infer<typeof moderationQueueSchema>;

export const moderationQueueQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.moderation.list(),
    queryFn: async ({ signal }) =>
      moderationQueueSchema.parse(await apiRequest('/admin/moderation', { signal })),
    ...listQuery,
  });

/*
 * A content tree to preview: the authoring view's modules (live) or a revision's proposed
 * tree. Both carry exam answers, so these queries use the authoring cache rules.
 */
const previewChoiceSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  isCorrect: z.boolean(),
});

const previewQuestionSchema = z.object({
  id: z.string().optional(),
  prompt: z.string(),
  isMultiple: z.boolean(),
  points: z.number(),
  choices: z.array(previewChoiceSchema),
});

const previewItemSchema = z.object({
  id: z.string().optional(),
  type: itemTypeSchema,
  title: z.string(),
  youtubeVideoId: z.string().nullish(),
  youtubeTitle: z.string().nullish(),
  isAvailable: z.boolean().nullish(),
  sizeBytes: z.number().nullish(),
  pageCount: z.number().nullish(),
  instructions: z.string().nullish(),
  passingScorePercent: z.number().nullish(),
  maxAttempts: z.number().nullish(),
  timeLimitMinutes: z.number().nullish(),
  questions: z.array(previewQuestionSchema).optional(),
});

const previewModuleSchema = z.object({
  id: z.string().optional(),
  title: z.string(),
  description: z.string().nullish(),
  items: z.array(previewItemSchema),
});

export type PreviewItem = z.infer<typeof previewItemSchema>;
export type PreviewModule = z.infer<typeof previewModuleSchema>;

/** GET /courses/:id/authoring, read-only for the course review page. */
export const courseReviewSchema = z.object({
  course: courseDetailSchema,
  modules: z.array(previewModuleSchema),
});

export type CourseReview = z.infer<typeof courseReviewSchema>;

export const courseReviewQueryOptions = (courseId: string) =>
  queryOptions({
    queryKey: [...authoringKeys.course(courseId), 'review'] as const,
    queryFn: async ({ signal }) =>
      courseReviewSchema.parse(await apiRequest(`/courses/${courseId}/authoring`, { signal })),
    ...authoringQuery,
  });

/** GET /admin/revisions/:id (reference/openapi.yaml: RevisionReview). */
export const revisionChangeSchema = z.object({
  kind: z.enum(['added', 'removed', 'moved', 'edited', 'reordered']),
  target: z.enum(['course', 'module', 'item']),
  title: z.string(),
  itemType: itemTypeSchema.optional(),
  fields: z.array(z.string()).optional(),
  fromModule: z.string().optional(),
  toModule: z.string().optional(),
});

export type RevisionChange = z.infer<typeof revisionChangeSchema>;

const courseFieldsSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    category: z.string().nullable().optional(),
    language: z.string().optional(),
  })
  .loose();

export const revisionReviewSchema = z.object({
  id: z.string(),
  courseId: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  rejectionReason: z.string().nullable(),
  submittedBy: z.string(),
  submittedAt: z.string(),
  lastDecision: z
    .object({
      id: z.string(),
      status: z.enum(['approved', 'rejected']),
      reason: z.string().nullable(),
      reviewedAt: z.string().nullable(),
    })
    .loose()
    .nullable(),
  changes: z.array(revisionChangeSchema),
  diff: z.object({
    course: z.object({ before: courseFieldsSchema, after: courseFieldsSchema }),
    modules: z.object({
      before: z.array(previewModuleSchema),
      after: z.array(previewModuleSchema),
    }),
  }),
});

export type RevisionReview = z.infer<typeof revisionReviewSchema>;

export const revisionReviewQueryOptions = (revisionId: string) =>
  queryOptions({
    queryKey: adminKeys.moderation.revision(revisionId),
    queryFn: async ({ signal }) =>
      revisionReviewSchema.parse(await apiRequest(`/admin/revisions/${revisionId}`, { signal })),
    ...authoringQuery,
  });

/** After any decision: queues, analytics, lists and the course itself are out of date. */
function useAfterDecision(courseId: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.moderation.all() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.analytics.all() }),
      queryClient.invalidateQueries({ queryKey: adminKeys.courses.all() }),
      queryClient.invalidateQueries({ queryKey: courseKeys.all }),
      queryClient.invalidateQueries({ queryKey: authoringKeys.course(courseId) }),
      queryClient.invalidateQueries({ queryKey: myCourseKeys.all }),
    ]);
}

export type Decision = { kind: 'approve' } | { kind: 'reject'; reason: string };

/** POST /admin/courses/:id/approve | reject. */
export function useDecideCourse(courseId: string) {
  const refresh = useAfterDecision(courseId);
  return useMutation({
    mutationFn: (decision: Decision) =>
      apiRequest<undefined>(`/admin/courses/${courseId}/${decision.kind}`, {
        method: 'POST',
        ...(decision.kind === 'reject' ? { body: { reason: decision.reason } } : {}),
      }),
    onSettled: refresh,
  });
}

/** POST /admin/revisions/:id/approve | reject. */
export function useDecideRevision(revisionId: string, courseId: string) {
  const refresh = useAfterDecision(courseId);
  return useMutation({
    mutationFn: (decision: Decision) =>
      apiRequest<undefined>(`/admin/revisions/${revisionId}/${decision.kind}`, {
        method: 'POST',
        ...(decision.kind === 'reject' ? { body: { reason: decision.reason } } : {}),
      }),
    onSettled: refresh,
  });
}
