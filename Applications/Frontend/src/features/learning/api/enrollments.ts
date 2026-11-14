import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/client';
import { listQuery } from '../../../shared/api/query-defaults';
import { enrollmentKeys } from '../../../shared/api/query-keys';
import { courseLanguageSchema } from '../../courses';

/** GET /me/enrollments (reference/openapi.yaml: Enrollment). `id` is the course id. */
export const enrollmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string().nullable(),
  language: courseLanguageSchema,
  thumbnailUrl: z.string().nullable(),
  enrolledAt: z.string(),
  progressPercent: z.number().int().min(0).max(100),
  moduleCount: z.number().int().min(0),
  /** 1-based module with the first unfinished item; null when all are done. */
  currentModule: z.number().int().min(1).nullable(),
  /** Latest progress, or the enrollment time. */
  lastActivityAt: z.string(),
});

export type Enrollment = z.infer<typeof enrollmentSchema>;

export const enrollmentsQueryOptions = () =>
  queryOptions({
    queryKey: enrollmentKeys.list(),
    queryFn: async ({ signal }) =>
      z.array(enrollmentSchema).parse(await apiRequest('/me/enrollments', { signal })),
    ...listQuery,
  });
