import type { AuthState } from './auth-state';

export type GuardDecision = { type: 'allow' | 'wait' } | { type: 'redirect'; href: string };

const authPagePaths = ['/login', '/signup', '/forgot-password'];

export function safeReturnPath(value: string | undefined): string | undefined {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(value, 'https://midroc.local');
  } catch {
    return undefined;
  }
  if (url.origin !== 'https://midroc.local') return undefined;
  const pathname = url.pathname;
  if (
    authPagePaths.includes(pathname) ||
    pathname === '/verify-email' ||
    pathname === '/suspended'
  ) {
    return undefined;
  }
  return value;
}

function withRedirect(path: string, returnTo: string | undefined): string {
  const safePath = safeReturnPath(returnTo);
  return safePath ? `${path}?redirect=${encodeURIComponent(safePath)}` : path;
}

export function decidePublicRoute(
  state: AuthState,
  pathname: string,
  returnTo?: string
): GuardDecision {
  if (state.status === 'loading') return { type: 'wait' };
  if (state.status === 'signedOut') return { type: 'allow' };

  if (!state.emailVerified) {
    return pathname === '/verify-email'
      ? { type: 'allow' }
      : { type: 'redirect', href: '/verify-email' };
  }

  if (state.suspended || state.profile?.status === 'suspended') {
    return pathname === '/suspended' ? { type: 'allow' } : { type: 'redirect', href: '/suspended' };
  }

  if (pathname === '/verify-email' || authPagePaths.includes(pathname)) {
    return { type: 'redirect', href: safeReturnPath(returnTo) ?? '/account' };
  }
  return { type: 'allow' };
}

export function decideAuthenticatedRoute(state: AuthState, currentPath: string): GuardDecision {
  if (state.status === 'loading') return { type: 'wait' };
  if (state.status === 'signedOut') {
    return { type: 'redirect', href: withRedirect('/login', currentPath) };
  }
  if (!state.emailVerified) return { type: 'redirect', href: '/verify-email' };
  if (state.suspended || state.profile?.status === 'suspended') {
    return { type: 'redirect', href: '/suspended' };
  }
  if (state.profileError) throw state.profileError;
  return { type: 'allow' };
}

export function decideAdminRoute(state: AuthState): GuardDecision {
  if (state.status === 'loading') return { type: 'wait' };
  if (state.status === 'signedOut')
    return { type: 'redirect', href: withRedirect('/login', '/admin') };
  if (!state.emailVerified) return { type: 'redirect', href: '/verify-email' };
  if (state.suspended || state.profile?.status === 'suspended') {
    return { type: 'redirect', href: '/suspended' };
  }
  if (state.profileError) throw state.profileError;
  return state.profile?.role === 'admin'
    ? { type: 'allow' }
    : { type: 'redirect', href: '/account' };
}
