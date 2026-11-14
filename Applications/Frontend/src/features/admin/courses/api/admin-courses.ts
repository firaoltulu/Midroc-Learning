import { keepPreviousData, queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../../shared/api/client';
import { listQuery } from '../../../../shared/api/query-defaults';
import { adminKeys, courseKeys } from '../../../../shared/api/query-keys';
import { courseSchema, itemTypeSchema, type CourseStatus } from '../../../courses';

/** Admin course lists (reference/openapi.yaml: AdminCourse). */
export const adminCourseSchema = courseSchema.extend({
  ownerName: z.string().nullable(),
  ownerEmail: z.string(),
  updatedAt: z.string(),
  enrollmentCount: z.number().int(),
});

export type AdminCourse = z.infer<typeof adminCourseSchema>;

const pageOf = <T extends z.ZodType>(item: T) =>
  z.object({
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    items: z.array(item),
  });

export const ADMIN_PAGE_SIZE = 20;

export interface AdminCoursesFilters {
  q?: string;
  status?: CourseStatus;
  page?: number;
}

/** GET /admin/courses: every course, newest first. */
export const adminCoursesQueryOptions = (filters: AdminCoursesFilters) =>
  queryOptions({
    queryKey: adminKeys.courses.list({ ...filters }),
    queryFn: async ({ signal }) =>
      pageOf(adminCourseSchema).parse(
        await apiRequest('/admin/courses', {
          signal,
          query: { ...filters, page: filters.page ?? 1, pageSize: ADMIN_PAGE_SIZE },
        }),
      ),
    placeholderData: keepPreviousData,
    ...listQuery,
  });

/** GET /admin/analytics/courses/:id (reference/openapi.yaml: CourseAnalytics). */
export const courseAnalyticsSchema = z.object({
  id: z.string(),
  title: z.string(),
  status: courseSchema.shape.status,
  enrollmentCount: z.number().int(),
  itemCount: z.number().int(),
  submittedAttemptCount: z.number().int(),
  averageExamScore: z.number().nullable(),
  examPassRate: z.number().nullable(),
  completedEnrollmentCount: z.number().int(),
  completionRate: z.number().nullable(),
  progressDistribution: z.array(
    z.object({ min: z.number().int(), max: z.number().int(), count: z.number().int() }),
  ),
  items: z.array(
    z.object({
      id: z.string(),
      type: itemTypeSchema,
      title: z.string(),
      moduleId: z.string(),
      moduleTitle: z.string(),
      completedCount: z.number().int(),
      submittedAttemptCount: z.number().int().nullable(),
      passRate: z.number().nullable(),
      averageScore: z.number().nullable(),
    }),
  ),
});

export type CourseAnalytics = z.infer<typeof courseAnalyticsSchema>;

export const courseAnalyticsQueryOptions = (courseId: string) =>
  queryOptions({
    queryKey: adminKeys.analytics.course(courseId),
    queryFn: async ({ signal }) =>
      courseAnalyticsSchema.parse(
        await apiRequest(`/admin/analytics/courses/${courseId}`, { signal }),
      ),
    ...listQuery,
  });

/** GET /admin/courses/:id/enrollments (reference/openapi.yaml: CourseEnrollment). */
export const courseEnrollmentSchema = z.object({
  userId: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  enrolledAt: z.string(),
  itemCount: z.number().int(),
  completedItemCount: z.number().int(),
  progressPercent: z.number().int(),
  lastActivityAt: z.string().nullable(),
});

export type CourseEnrollment = z.infer<typeof courseEnrollmentSchema>;

export interface EnrollmentFilters {
  q?: string;
  page?: number;
}

export const courseEnrollmentsQueryOptions = (courseId: string, filters: EnrollmentFilters) =>
  queryOptions({
    queryKey: adminKeys.courses.enrollments(courseId, { ...filters }),
    queryFn: async ({ signal }) =>
      pageOf(courseEnrollmentSchema).parse(
        await apiRequest(`/admin/courses/${courseId}/enrollments`, {
          signal,
          query: { ...filters, page: filters.page ?? 1, pageSize: ADMIN_PAGE_SIZE },
        }),
      ),
    placeholderData: keepPreviousData,
    ...listQuery,
  });

/** DELETE /admin/courses/:id/enrollments/:userId (progress is kept). */
export function useRemoveEnrollment(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiRequest<undefined>(`/admin/courses/${courseId}/enrollments/${userId}`, {
        method: 'DELETE',
      }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.courses.all() }),
        queryClient.invalidateQueries({ queryKey: adminKeys.analytics.all() }),
        queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
      ]),
  });
}
