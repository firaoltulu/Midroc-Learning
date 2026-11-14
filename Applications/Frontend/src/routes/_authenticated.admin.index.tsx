import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { AdminDashboardScreen, type DashboardSearch } from '../features/admin/dashboard';
import { compactSearch, isoDay, oneOf } from '../shared/lib/search-params';

// Defined here (not imported from the feature) so the dashboard stays out of the entry chunk.
const searchSchema = z.object({
  range: oneOf(['7d', '30d', '90d', '12m', 'custom']),
  interval: oneOf(['day', 'week', 'month']),
  from: isoDay(),
  to: isoDay(),
});

export const Route = createFileRoute('/_authenticated/admin/')({
  validateSearch: searchSchema,
  component: DashboardRoute,
});

function DashboardRoute() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  return (
    <AdminDashboardScreen
      search={search}
      onSearchChange={(next: DashboardSearch) => {
        void navigate({ search: compactSearch(next), replace: true });
      }}
    />
  );
}
