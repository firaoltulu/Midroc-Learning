import type { QueryClient } from '@tanstack/react-query';
import { redirect } from '@tanstack/react-router';
import { isAccountSuspended, meQueryOptions, type Me } from './api/me';
import type { AuthController } from './model/auth-controller';
import { isVerified } from './model/auth-state';
import { safeRedirect } from './lib/safe-redirect';

/**
 * Route guards (TanStack Router `beforeLoad`). They are UX only: the backend remains the
 * security boundary. Every guard first awaits `auth.ready()`, so nothing redirects or renders
 * guarded content while Firebase is still restoring the session (no redirect flash).
 */
export interface GuardContext {
  auth: AuthController;
  queryClient: QueryClient;
}

interface GuardArgs {
  context: GuardContext;
  location: { href: string };
}

/** Thrown by the admin guard; the admin layout renders the friendly "not allowed" screen. */
export class NotAllowedError extends Error {
  constructor() {
    super('Administrator access required');
    this.name = 'NotAllowedError';
  }
}

/** `_authenticated`: signed in, verified (password accounts) and a loaded, active /me. */
export async function requireAuthenticated({ context, location }: GuardArgs): Promise<{ me: Me }> {
  const state = await context.auth.ready();
  if (state.status !== 'signedIn') {
    // Carry the reason if the app signed the user out itself (e.g. suspension), so the
    // login page can explain it whichever redirect gets there first.
    throw redirect({
      to: '/login',
      search: { redirect: location.href, ...(state.reason ? { reason: state.reason } : {}) },
    });
  }
  if (!isVerified(state.user)) {
    throw redirect({ to: '/verify-email', search: { redirect: location.href } });
  }

  let me: Me;
  try {
    me = await context.queryClient.query(meQueryOptions());
  } catch (error) {
    if (isAccountSuspended(error)) await signOutSuspended(context);
    throw error;
  }
  if (me.status === 'suspended') await signOutSuspended(context);
  return { me };
}

async function signOutSuspended(context: GuardContext): Promise<never> {
  await context.auth.signOut({ reason: 'suspended' });
  context.queryClient.clear();
  throw redirect({ to: '/login', search: { reason: 'suspended' } });
}

/** `admin` (inside `_authenticated`): requires role admin from /me, not the token claim. */
export function requireAdmin({ context }: { context: { me: Me } }) {
  if (context.me.role !== 'admin') throw new NotAllowedError();
}

/**
 * Login, sign-up and password reset: a signed-in user is sent on, to the return path when
 * verified or to email verification when not.
 */
export async function redirectIfSignedIn({
  context,
  search,
}: {
  context: GuardContext;
  search: { redirect?: string };
}) {
  const state = await context.auth.ready();
  if (state.status !== 'signedIn') return;
  if (isVerified(state.user)) throw redirect({ href: safeRedirect(search.redirect) });
  throw redirect({ to: '/verify-email', search: { redirect: search.redirect } });
}

/** /verify-email: only for a signed-in password account that isn't verified yet. */
export async function requireUnverified({
  context,
  search,
}: {
  context: GuardContext;
  search: { redirect?: string };
}) {
  const state = await context.auth.ready();
  if (state.status !== 'signedIn') {
    throw redirect({ to: '/login', search: { redirect: search.redirect } });
  }
  if (isVerified(state.user)) throw redirect({ href: safeRedirect(search.redirect) });
  return { user: state.user };
}
