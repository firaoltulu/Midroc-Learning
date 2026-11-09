import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { waitForAuthState } from '../shared/auth/auth-state';
import { decideAdminRoute } from '../shared/auth/route-guards';

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: async () => {
    const state = await waitForAuthState();
    const decision = decideAdminRoute(state);
    if (decision.type === 'redirect') throw redirect({ href: decision.href });
    if (state.status === 'signedIn' && state.profileError) throw state.profileError;
  },
  component: Outlet
});
