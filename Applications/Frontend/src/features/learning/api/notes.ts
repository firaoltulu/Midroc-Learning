import { queryOptions, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { apiRequest } from '../../../shared/api/client';
import { learningKeys } from '../../../shared/api/query-keys';
import { listQuery } from '../../../shared/api/query-defaults';

/** reference/openapi.yaml: Note. Private to the viewer. */
export const noteSchema = z.object({
  id: z.string(),
  body: z.string(),
  positionSeconds: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type Note = z.infer<typeof noteSchema>;

export const notesQueryOptions = (itemId: string) =>
  queryOptions({
    queryKey: learningKeys.notes(itemId),
    queryFn: async ({ signal }) =>
      z.array(noteSchema).parse(await apiRequest(`/items/${itemId}/notes`, { signal })),
    ...listQuery,
  });

/** Add, edit or delete a note; each refreshes the item's notes. */
export function useNoteMutations(itemId: string) {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: learningKeys.notes(itemId) });
  const add = useMutation({
    mutationFn: async (body: string) =>
      noteSchema.parse(
        await apiRequest(`/items/${itemId}/notes`, {
          method: 'POST',
          body: { body, positionSeconds: null },
        }),
      ),
    onSuccess: refresh,
  });
  const edit = useMutation({
    mutationFn: async ({ noteId, body }: { noteId: string; body: string }) =>
      noteSchema.parse(await apiRequest(`/notes/${noteId}`, { method: 'PATCH', body: { body } })),
    onSuccess: refresh,
  });
  const remove = useMutation({
    mutationFn: (noteId: string) => apiRequest<unknown>(`/notes/${noteId}`, { method: 'DELETE' }),
    onSuccess: refresh,
  });
  return { add, edit, remove };
}
