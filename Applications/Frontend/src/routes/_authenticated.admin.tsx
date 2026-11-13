import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAdmin } from '../features/auth';

// Admin area: role from /me must be 'admin'; otherwise the "not allowed" screen is shown.
export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: ({ context }) => {
    requireAdmin({ context });
  },
  component: Outlet,
});
