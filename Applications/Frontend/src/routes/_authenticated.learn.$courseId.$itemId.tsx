import { createFileRoute } from '@tanstack/react-router';
import { PlayerScreen } from '../features/learning';

export const Route = createFileRoute('/_authenticated/learn/$courseId/$itemId')({
  component: PlayerRoute,
});

function PlayerRoute() {
  const { courseId, itemId } = Route.useParams();
  // Keyed by item: each item starts with a fresh player and progress tracker.
  return <PlayerScreen key={itemId} courseId={courseId} itemId={itemId} />;
}
