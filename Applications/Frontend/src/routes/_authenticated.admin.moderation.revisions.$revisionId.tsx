import { createFileRoute } from '@tanstack/react-router';
import { RevisionReviewScreen } from '../features/admin/moderation';

export const Route = createFileRoute('/_authenticated/admin/moderation/revisions/$revisionId')({
  component: RevisionReviewRoute,
});

function RevisionReviewRoute() {
  const { revisionId } = Route.useParams();
  return <RevisionReviewScreen key={revisionId} revisionId={revisionId} />;
}
