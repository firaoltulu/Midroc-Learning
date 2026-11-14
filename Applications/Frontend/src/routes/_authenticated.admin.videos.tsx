import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { VideosScreen, type VideosSearch } from '../features/admin/videos';
import { compactSearch, pageNumber, searchText } from '../shared/lib/search-params';

const searchSchema = z.object({ q: searchText(), page: pageNumber() });

export const Route = createFileRoute('/_authenticated/admin/videos')({
  validateSearch: searchSchema,
  component: VideosRoute,
});

function VideosRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <VideosScreen
      search={search}
      onSearchChange={(next: VideosSearch, options) => {
        void navigate({ search: compactSearch(next), replace: options?.replace ?? false });
      }}
    />
  );
}
