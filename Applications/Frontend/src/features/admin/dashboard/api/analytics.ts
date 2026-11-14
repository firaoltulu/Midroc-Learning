import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../../shared/api/client';
import { listQuery } from '../../../../shared/api/query-defaults';
import { adminKeys } from '../../../../shared/api/query-keys';

const statusCountsSchema = z.object({
  draft: z.number().int(),
  pending_review: z.number().int(),
  published: z.number().int(),
  rejected: z.number().int(),
  archived: z.number().int(),
});

/** GET /admin/analytics/overview (reference/openapi.yaml: AnalyticsOverview). */
export const overviewSchema = z.object({
  userCount: z.number().int(),
  courseCount: z.number().int(),
  publishedCourseCount: z.number().int(),
  enrollmentCount: z.number().int(),
  submittedAttemptCount: z.number().int(),
  averageExamScore: z.number().nullable(),
  examPassRate: z.number().nullable(),
  enrollmentsLast30Days: z.number().int(),
  activeLearnerCount: z.number().int(),
  pendingRevisionCount: z.number().int(),
  coursesByStatus: statusCountsSchema,
});

export type Overview = z.infer<typeof overviewSchema>;

export const overviewQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.analytics.overview(),
    queryFn: async ({ signal }) =>
      overviewSchema.parse(await apiRequest('/admin/analytics/overview', { signal })),
    ...listQuery,
  });

export type SeriesInterval = 'day' | 'week' | 'month';

export interface SeriesRange {
  from: string;
  to: string;
  interval: SeriesInterval;
}

const seriesSchema = z.array(z.object({ date: z.string(), count: z.number().int() }));
export type EnrollmentPoint = z.infer<typeof seriesSchema>[number];

/** GET /admin/analytics/enrollments: one zero-filled point per UTC bucket. */
export const enrollmentSeriesQueryOptions = (range: SeriesRange) =>
  queryOptions({
    queryKey: adminKeys.analytics.enrollments({ ...range }),
    queryFn: async ({ signal }) =>
      seriesSchema.parse(
        await apiRequest('/admin/analytics/enrollments', { signal, query: { ...range } }),
      ),
    ...listQuery,
  });

/** GET /admin/analytics/courses: the courses with the most enrollments. */
export const topCourseSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: z.enum(['draft', 'pending_review', 'published', 'rejected', 'archived']),
  enrollmentCount: z.number().int(),
  completedCount: z.number().int(),
  completionRate: z.number().nullable(),
});

export type TopCourse = z.infer<typeof topCourseSchema>;

export const topCoursesQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.analytics.courses(),
    queryFn: async ({ signal }) =>
      z.array(topCourseSchema).parse(await apiRequest('/admin/analytics/courses', { signal })),
    ...listQuery,
  });
