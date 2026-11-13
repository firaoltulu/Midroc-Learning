import { queryOptions, useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { apiRequest, apiUpload, type UploadOptions } from '../../../shared/api/client';
import { authoringQuery } from '../../../shared/api/query-defaults';
import { authoringKeys, courseKeys, myCourseKeys } from '../../../shared/api/query-keys';
import { courseSchema } from '../../courses';
import {
  authoringViewSchema,
  itemSummarySchema,
  moduleSummarySchema,
  pdfUploadSchema,
  type AuthoringModule,
  type AuthoringQuestion,
  type AuthoringView,
  type CoursePatch,
  type ItemCreate,
  type ItemPatch,
  type QuestionInput,
} from './schemas';

/**
 * The draft/rejected editor saves through the granular endpoints. Every mutation keeps the
 * authoring view in the cache current (directly when the response or the request says what
 * changed, otherwise by refetching it) and marks the owner's list and the course page stale.
 */

/** GET /courses/:id/authoring: the full tree, including answers (short-lived cache). */
export const authoringQueryOptions = (courseId: string) =>
  queryOptions({
    queryKey: authoringKeys.course(courseId),
    queryFn: async ({ signal }) =>
      authoringViewSchema.parse(await apiRequest(`/courses/${courseId}/authoring`, { signal })),
    ...authoringQuery,
  });

function updateView(
  queryClient: QueryClient,
  courseId: string,
  update: (view: AuthoringView) => AuthoringView,
) {
  queryClient.setQueryData<AuthoringView>(authoringKeys.course(courseId), (view) =>
    view ? update(view) : view,
  );
}

const mapModules = (
  view: AuthoringView,
  update: (module: AuthoringModule) => AuthoringModule,
): AuthoringView => ({ ...view, modules: view.modules.map(update) });

/** The owner's list and the course page show what the editor changes. */
function markOthersStale(queryClient: QueryClient, courseId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: myCourseKeys.all }),
    queryClient.invalidateQueries({ queryKey: courseKeys.detail(courseId) }),
  ]);
}

function refetchView(queryClient: QueryClient, courseId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: authoringKeys.course(courseId) }),
    markOthersStale(queryClient, courseId),
  ]);
}

// Saving shows its own state (indicator and field errors): no global network toast.
const editorMeta = { networkErrorToast: false } as const;

/** PATCH /courses/:id. The returned course replaces the cached fields. */
export function useUpdateCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: CoursePatch) =>
      courseSchema.parse(
        await apiRequest(`/courses/${courseId}`, { method: 'PATCH', body: patch }),
      ),
    onSuccess: (course) => {
      updateView(queryClient, courseId, (view) => ({
        ...view,
        course: { ...view.course, ...course },
      }));
      return markOthersStale(queryClient, courseId);
    },
    meta: editorMeta,
  });
}

/** POST /courses/:id/modules (added at the end). */
export function useAddModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title: string; description?: string }) =>
      moduleSummarySchema.parse(
        await apiRequest(`/courses/${courseId}/modules`, { method: 'POST', body: input }),
      ),
    onSuccess: (module) => {
      updateView(queryClient, courseId, (view) => ({
        ...view,
        modules: [...view.modules, { ...module, items: [] }],
      }));
      return markOthersStale(queryClient, courseId);
    },
    meta: editorMeta,
  });
}

/** PATCH /modules/:id (title, description). */
export function useUpdateModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, patch }: { moduleId: string; patch: ModulePatch }) =>
      apiRequest<undefined>(`/modules/${moduleId}`, { method: 'PATCH', body: patch }),
    onSuccess: (_data, { moduleId, patch }) => {
      updateView(queryClient, courseId, (view) =>
        mapModules(view, (module) => (module.id === moduleId ? { ...module, ...patch } : module)),
      );
      return markOthersStale(queryClient, courseId);
    },
    meta: editorMeta,
  });
}

export interface ModulePatch {
  title?: string;
  description?: string;
}

/** DELETE /modules/:id (and its items). */
export function useDeleteModule(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleId: string) =>
      apiRequest<undefined>(`/modules/${moduleId}`, { method: 'DELETE' }),
    onSuccess: () => refetchView(queryClient, courseId),
    meta: editorMeta,
  });
}

/**
 * PUT /courses/:id/modules/order with the complete id list. Optimistic: the tree shows the new
 * order at once, and goes back (and reloads the tree) if the server refuses it.
 */
export function useReorderModules(courseId: string) {
  const queryClient = useQueryClient();
  const key = authoringKeys.course(courseId);
  return useMutation({
    mutationFn: (moduleIds: string[]) =>
      apiRequest<undefined>(`/courses/${courseId}/modules/order`, {
        method: 'PUT',
        body: { moduleIds },
      }),
    onMutate: async (moduleIds) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AuthoringView>(key);
      updateView(queryClient, courseId, (view) => ({
        ...view,
        modules: orderBy(view.modules, moduleIds),
      }));
      return { previous };
    },
    onSuccess: () => markOthersStale(queryClient, courseId),
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      // The server may know a different tree (INVALID_ORDER): show what it has.
      return refetchView(queryClient, courseId);
    },
    meta: editorMeta,
  });
}

/** POST /modules/:id/items: a video (verified), a PDF (uploaded first) or an exam. */
export function useAddItem(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ moduleId, item }: { moduleId: string; item: ItemCreate }) =>
      itemSummarySchema.parse(
        await apiRequest(`/modules/${moduleId}/items`, { method: 'POST', body: item }),
      ),
    onSuccess: () => refetchView(queryClient, courseId),
    meta: editorMeta,
  });
}

/**
 * PATCH /items/:id. A new video link or file is verified on the server and changes what the
 * view shows (video title, page count): refetch. Other fields are applied to the cache.
 */
export function useUpdateItem(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, patch }: { itemId: string; patch: ItemPatch }) =>
      apiRequest<undefined>(`/items/${itemId}`, { method: 'PATCH', body: patch }),
    onSuccess: (_data, { itemId, patch }) => {
      if (patch.url !== undefined || patch.fileKey !== undefined) {
        return refetchView(queryClient, courseId);
      }
      updateView(queryClient, courseId, (view) =>
        mapModules(view, (module) => ({
          ...module,
          items: module.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
        })),
      );
      return markOthersStale(queryClient, courseId);
    },
    meta: editorMeta,
  });
}

/** DELETE /items/:id. */
export function useDeleteItem(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (itemId: string) => apiRequest<undefined>(`/items/${itemId}`, { method: 'DELETE' }),
    onSuccess: () => refetchView(queryClient, courseId),
    meta: editorMeta,
  });
}

/** PUT /modules/:id/items/order with the complete id list (optimistic, like modules). */
export function useReorderItems(courseId: string) {
  const queryClient = useQueryClient();
  const key = authoringKeys.course(courseId);
  return useMutation({
    mutationFn: ({ moduleId, itemIds }: { moduleId: string; itemIds: string[] }) =>
      apiRequest<undefined>(`/modules/${moduleId}/items/order`, {
        method: 'PUT',
        body: { itemIds },
      }),
    onMutate: async ({ moduleId, itemIds }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<AuthoringView>(key);
      updateView(queryClient, courseId, (view) =>
        mapModules(view, (module) =>
          module.id === moduleId ? { ...module, items: orderBy(module.items, itemIds) } : module,
        ),
      );
      return { previous };
    },
    onSuccess: () => markOthersStale(queryClient, courseId),
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
      return refetchView(queryClient, courseId);
    },
    meta: editorMeta,
  });
}

/**
 * PUT /items/:id/questions (existing questions and choices matched by id, new ones without).
 * Resolves with the saved questions as the server now has them (with the new ids), in order.
 */
export function useReplaceQuestions(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      itemId,
      questions,
    }: {
      itemId: string;
      questions: QuestionInput[];
    }): Promise<AuthoringQuestion[]> => {
      await apiRequest<undefined>(`/items/${itemId}/questions`, {
        method: 'PUT',
        body: { questions },
      });
      const view = await queryClient.query({ ...authoringQueryOptions(courseId), staleTime: 0 });
      const item = view.modules.flatMap((module) => module.items).find(({ id }) => id === itemId);
      return item?.questions ?? [];
    },
    onSuccess: () => markOthersStale(queryClient, courseId),
    meta: editorMeta,
  });
}

/** POST /courses/:id/submit: draft or rejected → pending_review. */
export function useSubmitCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<undefined>(`/courses/${courseId}/submit`, { method: 'POST' }),
    onSuccess: () => refetchView(queryClient, courseId),
    meta: editorMeta,
  });
}

/**
 * DELETE /courses/:id (offered for drafts). The course's cached views are dropped, not
 * refetched; the owner's list is refreshed.
 */
export function useDeleteCourse(courseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiRequest<undefined>(`/courses/${courseId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: authoringKeys.course(courseId) });
      queryClient.removeQueries({ queryKey: courseKeys.detail(courseId) });
      return queryClient.invalidateQueries({ queryKey: myCourseKeys.all });
    },
    meta: editorMeta,
  });
}

/** POST /pdf-uploads with upload progress. The returned fileKey is attached to an item next. */
export async function uploadPdf(file: File, options: UploadOptions = {}) {
  const body = new FormData();
  body.append('file', file);
  return pdfUploadSchema.parse(await apiUpload('/pdf-uploads', body, options));
}

/** Entries in the order of `ids` (entries not listed keep their relative order at the end). */
function orderBy<T extends { id: string }>(entries: T[], ids: string[]): T[] {
  const rank = new Map(ids.map((id, index) => [id, index]));
  return [...entries].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
}
