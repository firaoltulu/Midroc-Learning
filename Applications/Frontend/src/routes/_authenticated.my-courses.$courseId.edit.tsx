import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { z } from 'zod';
import { EditorScreen, type EditorTab } from '../features/editor';

// Defined here, not imported from the editor feature: a value import in the route options
// would load the whole editor up front (the route tree is in the entry chunk). Only the type
// comes from the feature, and it disappears at build time.
const tabs = ['details', 'content', 'review'] as const satisfies readonly EditorTab[];
const editorSearchSchema = z.object({ tab: z.enum(tabs).optional().catch(undefined) });

export const Route = createFileRoute('/_authenticated/my-courses/$courseId/edit')({
  // The editor brings its own top bar.
  staticData: { layout: 'focus' },
  validateSearch: editorSearchSchema,
  component: EditorRoute,
});

function EditorRoute() {
  const { courseId } = Route.useParams();
  const { tab } = Route.useSearch();
  const navigate = Route.useNavigate();
  const onTabChange = useCallback(
    (next: EditorTab) => {
      void navigate({ search: { tab: next }, replace: true });
    },
    [navigate],
  );
  // Keyed by course: a different course starts with fresh editor state.
  return <EditorScreen key={courseId} courseId={courseId} tab={tab} onTabChange={onTabChange} />;
}
