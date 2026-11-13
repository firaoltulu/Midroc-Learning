import { createFileRoute, Outlet } from '@tanstack/react-router';

// Pathless layout for login, sign-up, password reset and email verification. Each child
// route has its own guard (signed-in users are sent on; /verify-email needs an unverified
// user), so this layout only groups them.
export const Route = createFileRoute('/_public')({
  component: Outlet,
});
