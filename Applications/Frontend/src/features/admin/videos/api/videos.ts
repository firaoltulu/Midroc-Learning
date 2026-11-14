import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../../shared/api/client';
import { listQuery } from '../../../../shared/api/query-defaults';
import { adminKeys, authoringKeys } from '../../../../shared/api/query-keys';

/** reference/openapi.yaml: UnavailableVideo (no video id: only titles are shown). */
export const unavailableVideoSchema = z.object({
  itemId: z.string(),
  itemTitle: z.string(),
  youtubeTitle: z.string().nullable(),
  lastCheckedAt: z.string().nullable(),
  courseId: z.string(),
  courseTitle: z.string(),
  ownerId: z.string(),
  ownerName: z.string().nullable(),
  ownerEmail: z.string(),
});

export type UnavailableVideo = z.infer<typeof unavailableVideoSchema>;

/** GET /admin/videos/unavailable, most recently checked first. */
export const unavailableVideosQueryOptions = () =>
  queryOptions({
    queryKey: adminKeys.videos.unavailable(),
    queryFn: async ({ signal }) =>
      z
        .array(unavailableVideoSchema)
        .parse(await apiRequest('/admin/videos/unavailable', { signal })),
    ...listQuery,
  });

/** reference/openapi.yaml: YoutubeCheckResult. */
export const youtubeCheckResultSchema = z.object({
  checked: z.number().int(),
  available: z.number().int(),
  newlyUnavailable: z.number().int(),
  recovered: z.number().int(),
  stillUnavailable: z.number().int(),
  unreachable: z.number().int(),
  aborted: z.boolean(),
  skipped: z.boolean(),
});

export type YoutubeCheckResult = z.infer<typeof youtubeCheckResultSchema>;

/** POST /admin/jobs/youtube-check (409 JOB_ALREADY_RUNNING when one is in progress). */
export function useRunYoutubeCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () =>
      youtubeCheckResultSchema.parse(
        await apiRequest('/admin/jobs/youtube-check', { method: 'POST' }),
      ),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: [...adminKeys.all, 'videos'] }),
        // Availability shows in the editor and in course reviews.
        queryClient.invalidateQueries({ queryKey: authoringKeys.all }),
      ]),
    meta: { networkErrorToast: false },
  });
}
