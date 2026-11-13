import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/client';
import { listQuery } from '../../../shared/api/query-defaults';
import { myCourseKeys } from '../../../shared/api/query-keys';
import { courseSchema } from '../../courses';

/** GET /me/courses (reference/openapi.yaml: OwnedCourse). */
export const ownedCourseSchema = courseSchema.extend({
  updatedAt: z.string(),
  moduleCount: z.number().int(),
  enrollmentCount: z.number().int(),
  pendingRevision: z.object({ id: z.string(), submittedAt: z.string() }).nullable(),
});

export type OwnedCourse = z.infer<typeof ownedCourseSchema>;

export const myCoursesQueryOptions = () =>
  queryOptions({
    queryKey: myCourseKeys.list(),
    queryFn: async ({ signal }) =>
      z.array(ownedCourseSchema).parse(await apiRequest('/me/courses', { signal })),
    ...listQuery,
  });

export interface CourseCreate {
  title: string;
  language: 'en' | 'am';
  description?: string;
}

/** POST /courses: a new draft. */
export function useCreateCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CourseCreate) =>
      courseSchema.parse(await apiRequest('/courses', { method: 'POST', body: input })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: myCourseKeys.all }),
  });
}
