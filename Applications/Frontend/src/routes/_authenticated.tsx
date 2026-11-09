import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { decideAuthenticatedRoute } from '../shared/auth/route-guards';
import { waitForAuthState } from '../shared/auth/auth-state';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const state = await waitForAuthState();
    const decision = decideAuthenticatedRoute(state, location.href);
    if (decision.type === 'redirect') throw redirect({ href: decision.href });
    if (state.status === 'signedIn' && state.profileError) throw state.profileError;
  },
  component: Outlet
});
