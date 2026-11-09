import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { decidePublicRoute } from '../shared/auth/route-guards';
import { waitForAuthState } from '../shared/auth/auth-state';

export const Route = createFileRoute('/_public')({
  beforeLoad: async ({ location }) => {
    const state = await waitForAuthState();
    const search = new URL(location.href, 'http://midroc.local').searchParams;
    const decision = decidePublicRoute(
      state,
      location.pathname,
      search.get('redirect') ?? undefined
    );
    if (decision.type === 'redirect') throw redirect({ href: decision.href });
  },
  component: Outlet
});
