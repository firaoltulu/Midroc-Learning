import { createFileRoute, Outlet } from '@tanstack/react-router';

// Pathless layout for login, sign-up, password reset and email verification. Each child
// route has its own guard (signed-in users are sent on; /verify-email needs an unverified
// user), so this layout only groups them. The pages draw their own split screen, so the
// shell's header and footer are left out.
export const Route = createFileRoute('/_public')({
  staticData: { layout: 'focus' },
  component: Outlet,
});
