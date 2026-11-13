import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { z } from 'zod';
import { apiBlob, apiRequest } from '../../../shared/api/client';
import { courseKeys, enrollmentKeys, learningKeys } from '../../../shared/api/query-keys';
import type { CourseDetail } from '../../courses';
import type { ProgressPayload } from '../model/video-progress';

/** GET /items/:id/video (reference/openapi.yaml: VideoPlayback). */
export const videoPlaybackSchema = z.object({
  youtubeVideoId: z.string(),
  youtubeTitle: z.string().nullable(),
  isAvailable: z.boolean(),
  lastPositionSeconds: z.number().int().min(0),
  completed: z.boolean(),
});

export type VideoPlayback = z.infer<typeof videoPlaybackSchema>;

/**
 * Playback data is private and position-dependent: always fresh, dropped soon after leaving,
 * never refetched mid-video on window focus.
 */
const playbackQuery = { staleTime: 0, gcTime: 30_000, refetchOnWindowFocus: false } as const;

export const videoQueryOptions = (itemId: string) =>
  queryOptions({
    queryKey: learningKeys.video(itemId),
    queryFn: async ({ signal }) =>
      videoPlaybackSchema.parse(await apiRequest(`/items/${itemId}/video`, { signal })),
    ...playbackQuery,
  });

/** GET /items/:id/pdf as a Blob: the request carries the auth header, a plain link can't. */
export const pdfQueryOptions = (itemId: string) =>
  queryOptions({
    queryKey: learningKeys.pdf(itemId),
    queryFn: ({ signal }) => apiBlob(`/items/${itemId}/pdf`, { signal }),
    ...playbackQuery,
  });

/**
 * Saves progress for an item (PUT /items/:id/progress). On completion the course outline is
 * updated at once (the check mark appears) and the course and My learning are refreshed.
 * Fire-and-forget: a failed save is retried by the next one (it always sends the position).
 */
export function useSaveProgress(courseId: string, itemId: string) {
  const queryClient = useQueryClient();
  return useCallback(
    (payload: ProgressPayload, options: { keepalive: boolean } = { keepalive: false }) => {
      if (payload.completed) {
        queryClient.setQueryData<CourseDetail>(courseKeys.detail(courseId), (course) =>
          course && !course.completedItemIds.includes(itemId)
            ? { ...course, completedItemIds: [...course.completedItemIds, itemId] }
            : course,
        );
      }
      void apiRequest(`/items/${itemId}/progress`, {
        method: 'PUT',
        body: payload,
        keepalive: options.keepalive,
      })
        .then(() => {
          if (!payload.completed) return;
          void queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) });
          void queryClient.invalidateQueries({ queryKey: enrollmentKeys.all });
        })
        .catch(() => {
          // Progress is best effort; the next save carries the latest position again.
        });
    },
    [queryClient, courseId, itemId],
  );
}
