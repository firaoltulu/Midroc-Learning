import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AdminCoursesScreen, type AdminCoursesFilters } from '../features/admin/courses';
import { compactSearch, oneOf, pageNumber, searchText } from '../shared/lib/search-params';

const searchSchema = z.object({
  q: searchText(),
  status: oneOf(['draft', 'pending_review', 'published', 'rejected', 'archived']),
  page: pageNumber(),
});

export const Route = createFileRoute('/_authenticated/admin/courses/')({
  validateSearch: searchSchema,
  component: AdminCoursesRoute,
});

function AdminCoursesRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <AdminCoursesScreen
      search={search}
      onSearchChange={(next: AdminCoursesFilters, options) => {
        void navigate({ search: compactSearch(next), replace: options?.replace ?? false });
      }}
    />
  );
}
