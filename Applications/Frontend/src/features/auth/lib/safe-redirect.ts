const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/verify-email'];

/**
 * Only same-origin, absolute paths are allowed as a post-sign-in target (no open redirects:
 * rejects `//host`, `/\host`, full URLs and the auth pages themselves). Falls back to `/`.
 */
export function safeRedirect(target: unknown): string {
  if (typeof target !== 'string' || !target.startsWith('/')) return '/';
  if (target.startsWith('//') || target.startsWith('/\\')) return '/';
  const path = target.split(/[?#]/)[0] ?? '/';
  if (AUTH_PAGES.includes(path)) return '/';
  return target;
}
