import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { UsersScreen, type UsersFilters } from '../features/admin/users';
import { compactSearch, oneOf, pageNumber, searchText } from '../shared/lib/search-params';

const searchSchema = z.object({
  q: searchText(),
  role: oneOf(['user', 'admin']),
  status: oneOf(['active', 'suspended']),
  page: pageNumber(),
});

export const Route = createFileRoute('/_authenticated/admin/users/')({
  validateSearch: searchSchema,
  component: UsersRoute,
});

function UsersRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <UsersScreen
      search={search}
      onSearchChange={(next: UsersFilters, options) => {
        void navigate({ search: compactSearch(next), replace: options?.replace ?? false });
      }}
    />
  );
}
