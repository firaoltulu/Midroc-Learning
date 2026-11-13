import { createFileRoute } from '@tanstack/react-router';
import { useCallback } from 'react';
import { CatalogScreen, catalogSearchSchema, type CatalogSearch } from '../features/catalog';

export const Route = createFileRoute('/_authenticated/courses/')({
  validateSearch: catalogSearchSchema,
  component: CatalogRoute,
});

function CatalogRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const onSearchChange = useCallback(
    (next: CatalogSearch, options?: { replace?: boolean }) => {
      void navigate({ search: next, replace: options?.replace ?? false });
    },
    [navigate],
  );
  return <CatalogScreen search={search} onSearchChange={onSearchChange} />;
}
