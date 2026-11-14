import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ModerationScreen, type ModerationSearch } from '../features/admin/moderation';
import { compactSearch, oneOf } from '../shared/lib/search-params';

const searchSchema = z.object({ tab: oneOf(['courses', 'revisions']) });

export const Route = createFileRoute('/_authenticated/admin/moderation/')({
  validateSearch: searchSchema,
  component: ModerationRoute,
});

function ModerationRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <ModerationScreen
      search={search}
      onSearchChange={(next: ModerationSearch) => {
        void navigate({ search: compactSearch(next) });
      }}
    />
  );
}
