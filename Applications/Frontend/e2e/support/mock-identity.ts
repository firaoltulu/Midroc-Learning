import type { Page, Request } from '@playwright/test';
import type { MockUser } from './mock-api';

/**
 * Several people in one test (an owner, then an administrator): GET /me answers for whoever
 * the request's emulator ID token belongs to. Register after mockApi so this route wins.
 */
export async function mockIdentity(page: Page, users: MockUser[]) {
  await page.route('**/api/me', (route) => {
    const email = tokenEmail(route.request());
    const me = users.find((user) => user.email === email);
    return me
      ? route.fulfill({ json: me })
      : route.fulfill({ status: 401, json: { error: 'Unknown user', code: 'UNAUTHENTICATED' } });
  });
}

/** The `email` claim of the bearer token (emulator tokens are plain, unsigned JWTs). */
export function tokenEmail(request: Request): string | undefined {
  const header = request.headers().authorization as string | undefined;
  const token = header?.replace(/^Bearer /, '');
  const payload = token?.split('.')[1];
  if (!payload) return undefined;
  const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
    email?: string;
  };
  return claims.email;
}
