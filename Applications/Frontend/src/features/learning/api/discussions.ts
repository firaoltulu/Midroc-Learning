import {
  infiniteQueryOptions,
  queryOptions,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/client';
import { learningKeys } from '../../../shared/api/query-keys';
import { listQuery } from '../../../shared/api/query-defaults';

/** reference/openapi.yaml: Post, Thread, ThreadPage. Authors are "First L.", never emails. */
export const postSchema = z.object({
  id: z.string(),
  authorName: z.string().nullable(),
  mine: z.boolean(),
  byInstructor: z.boolean(),
  body: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const threadSchema = postSchema.extend({ replyCount: z.number().int() });
const threadPageSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  items: z.array(threadSchema),
});

export type Post = z.infer<typeof postSchema>;
export type Thread = z.infer<typeof threadSchema>;

export const THREADS_PAGE_SIZE = 10;

/** Threads on an item, newest first, a page at a time. The first page's total is the tab count. */
export const threadsQueryOptions = (itemId: string) =>
  infiniteQueryOptions({
    queryKey: learningKeys.discussions(itemId),
    queryFn: async ({ pageParam, signal }) =>
      threadPageSchema.parse(
        await apiRequest(`/items/${itemId}/discussions`, {
          query: { page: pageParam, pageSize: THREADS_PAGE_SIZE },
          signal,
        }),
      ),
    initialPageParam: 1,
    getNextPageParam: (last) =>
      last.page * last.pageSize < last.total ? last.page + 1 : undefined,
    ...listQuery,
  });

export const repliesQueryOptions = (postId: string) =>
  queryOptions({
    queryKey: learningKeys.replies(postId),
    queryFn: async ({ signal }) =>
      z.array(postSchema).parse(await apiRequest(`/discussions/${postId}/replies`, { signal })),
    ...listQuery,
  });

/** Start a thread on the item. */
export function useStartThread(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      threadSchema.parse(
        await apiRequest(`/items/${itemId}/discussions`, { method: 'POST', body: { body } }),
      ),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: learningKeys.discussions(itemId) }),
  });
}

/** Reply to a thread; the thread's reply count changes too. */
export function useReply(itemId: string, postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) =>
      postSchema.parse(
        await apiRequest(`/discussions/${postId}/replies`, { method: 'POST', body: { body } }),
      ),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: learningKeys.replies(postId) }),
        queryClient.invalidateQueries({ queryKey: learningKeys.discussions(itemId) }),
      ]),
  });
}

/** Delete a thread (with its replies) or a reply. */
export function useDeletePost(itemId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      apiRequest<unknown>(`/discussions/${postId}`, { method: 'DELETE' }),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: learningKeys.discussions(itemId) }),
        queryClient.invalidateQueries({ queryKey: [...learningKeys.all, 'replies'] }),
      ]),
  });
}
