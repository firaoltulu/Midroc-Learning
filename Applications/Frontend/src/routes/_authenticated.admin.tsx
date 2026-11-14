import { createFileRoute, Outlet } from '@tanstack/react-router';
import { AdminLayout } from '../features/admin/dashboard';
import { requireAdmin } from '../features/auth';

// Admin area: role from /me must be 'admin'; otherwise the "not allowed" screen is shown.
export const Route = createFileRoute('/_authenticated/admin')({
  // The admin area brings its own top bar and side navigation.
  staticData: { layout: 'focus' },
  beforeLoad: ({ context }) => {
    requireAdmin({ context });
  },
  component: AdminRoute,
});

function AdminRoute() {
  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  );
}
