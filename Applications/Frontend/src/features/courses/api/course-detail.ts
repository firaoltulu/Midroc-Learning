import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../shared/api/client';
import { courseKeys, enrollmentKeys } from '../../../shared/api/query-keys';
import { listQuery } from '../../../shared/api/query-defaults';
import { courseDetailSchema } from './schemas';

/** GET /courses/:id: header, outline and the viewer's enrollment and progress. */
export const courseDetailQueryOptions = (courseId: string) =>
  queryOptions({
    queryKey: courseKeys.detail(courseId),
    queryFn: async ({ signal }) =>
      courseDetailSchema.parse(await apiRequest(`/courses/${courseId}`, { signal })),
    ...listQuery,
  });

/**
 * Enrolling or unenrolling changes the course (enrolled, counts), the catalog and "My
 * learning": invalidate all of them.
 */
function useEnrollmentMutation(courseId: string, method: 'POST' | 'DELETE') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<unknown>(`/courses/${courseId}/enroll`, { method }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: courseKeys.all }),
        queryClient.invalidateQueries({ queryKey: enrollmentKeys.all }),
      ]),
  });
}

export const useEnroll = (courseId: string) => useEnrollmentMutation(courseId, 'POST');
export const useUnenroll = (courseId: string) => useEnrollmentMutation(courseId, 'DELETE');
