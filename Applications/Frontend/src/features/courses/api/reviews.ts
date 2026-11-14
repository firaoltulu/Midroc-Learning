import { infiniteQueryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/client';
import { courseKeys } from '../../../shared/api/query-keys';
import { listQuery } from '../../../shared/api/query-defaults';
import { ownReviewSchema } from './schemas';

/** GET /courses/:id/reviews (reference/openapi.yaml: Review, ReviewPage). */
export const reviewSchema = z.object({
  /** Opaque; administrators remove a review by it. */
  id: z.string(),
  /** "Sara T."; null when the author has no name. */
  authorName: z.string().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  mine: z.boolean(),
});

const reviewPageSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  items: z.array(reviewSchema),
});

export type Review = z.infer<typeof reviewSchema>;

export const REVIEWS_PAGE_SIZE = 5;

/** Reviews a page at a time ("Show more reviews"). */
export const reviewsQueryOptions = (courseId: string) =>
  infiniteQueryOptions({
    queryKey: courseKeys.reviews(courseId),
    queryFn: async ({ pageParam, signal }) =>
      reviewPageSchema.parse(
        await apiRequest(`/courses/${courseId}/reviews`, {
          query: { page: pageParam, pageSize: REVIEWS_PAGE_SIZE },
          signal,
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    ...listQuery,
  });

/**
 * Saving or deleting my review changes the course's rating (detail, catalog cards) and the
 * review list: invalidate the course data.
 */
function useReviewMutation<TInput>(courseId: string, method: 'PUT' | 'DELETE') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TInput) =>
      method === 'PUT'
        ? ownReviewSchema.parse(
            await apiRequest(`/courses/${courseId}/review`, { method, body: input }),
          )
        : apiRequest<unknown>(`/courses/${courseId}/review`, { method }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export const useSaveReview = (courseId: string) =>
  useReviewMutation<{ rating: number; comment: string }>(courseId, 'PUT');
/**
 * Administrators: remove a review that breaks the terms of use. The course rating and the
 * review list change, so the course data is refreshed.
 */
export function useRemoveReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (reviewId: string) =>
      apiRequest<unknown>(`/admin/reviews/${reviewId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: courseKeys.all }),
  });
}

export const useDeleteReview = (courseId: string) =>
  useReviewMutation<undefined>(courseId, 'DELETE');
