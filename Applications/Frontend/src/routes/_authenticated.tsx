import { createFileRoute, Outlet } from '@tanstack/react-router';
import { requireAuthenticated } from '../features/auth';

// Everything below needs a signed-in, verified user with an active /me profile.
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => requireAuthenticated({ context, location }),
  component: Outlet,
});
