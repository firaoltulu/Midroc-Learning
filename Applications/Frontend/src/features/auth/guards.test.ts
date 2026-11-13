import { QueryClient } from '@tanstack/react-query';
import { isRedirect } from '@tanstack/react-router';
import { authKeys } from './api/keys';
import type { Me } from './api/me';
import {
  NotAllowedError,
  redirectIfSignedIn,
  requireAdmin,
  requireAuthenticated,
  requireUnverified,
} from './guards';
import { createFakeAuthController, passwordUser } from './testing/fake-auth-controller';

const me = (overrides: Partial<Me> = {}): Me => ({
  id: 'u1',
  email: 'learner@example.com',
  name: 'Learner',
  role: 'user',
  status: 'active',
  createdAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

const location = { href: '/courses?page=2' };

function setup() {
  const fake = createFakeAuthController();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { fake, queryClient, context: { auth: fake.controller, queryClient } };
}

/** Runs a guard and returns what it threw (a redirect, an error) or resolved. */
async function outcome(run: () => unknown) {
  try {
    return { resolved: await run() };
  } catch (thrown) {
    if (isRedirect(thrown)) return { redirect: thrown.options };
    return { error: thrown };
  }
}

function mockMeResponse(status: number, body: unknown) {
  // A fresh Response per call: /me retries once on server errors.
  return vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('requireAuthenticated (_authenticated layout)', () => {
  it('waits while auth is loading: no redirect and no content until the state is known', async () => {
    const { fake, context } = setup();
    let settled = false;
    const result = outcome(() => requireAuthenticated({ context, location })).finally(() => {
      settled = true;
    });

    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(settled).toBe(false);

    fake.signOutNow();
    expect(await result).toEqual({
      redirect: expect.objectContaining({ to: '/login', search: { redirect: '/courses?page=2' } }),
    });
  });

  it('sends signed-out visitors to /login with the return path', async () => {
    const { fake, context } = setup();
    fake.signOutNow();
    expect(await outcome(() => requireAuthenticated({ context, location }))).toEqual({
      redirect: expect.objectContaining({ to: '/login', search: { redirect: '/courses?page=2' } }),
    });
  });

  it('sends unverified password accounts to /verify-email', async () => {
    const { fake, context } = setup();
    fake.signIn(passwordUser({ emailVerified: false }));
    expect(await outcome(() => requireAuthenticated({ context, location }))).toEqual({
      redirect: expect.objectContaining({
        to: '/verify-email',
        search: { redirect: '/courses?page=2' },
      }),
    });
  });

  it('treats Google accounts as verified and loads /me', async () => {
    const { fake, context, queryClient } = setup();
    fake.signIn(passwordUser({ emailVerified: false, providerIds: ['google.com'] }));
    queryClient.setQueryData(authKeys.me, me());
    expect(await outcome(() => requireAuthenticated({ context, location }))).toEqual({
      resolved: { me: me() },
    });
  });

  it('fetches /me with the bearer token when it is not cached', async () => {
    const { fake, context } = setup();
    fake.signIn();
    const fetchSpy = mockMeResponse(200, me());
    expect(await outcome(() => requireAuthenticated({ context, location }))).toEqual({
      resolved: { me: me() },
    });
    expect(fetchSpy).toHaveBeenCalledOnce();
    expect(fetchSpy).toHaveBeenCalledWith('/api/me', expect.anything());
  });

  it('signs out a suspended account (403 ACCOUNT_SUSPENDED) and explains on /login', async () => {
    const { fake, context, queryClient } = setup();
    fake.signIn();
    mockMeResponse(403, { error: 'Account is suspended', code: 'ACCOUNT_SUSPENDED' });
    queryClient.setQueryData(['courses', 'list'], { stale: true });

    expect(await outcome(() => requireAuthenticated({ context, location }))).toEqual({
      redirect: expect.objectContaining({ to: '/login', search: { reason: 'suspended' } }),
    });
    expect(fake.controller.signOut).toHaveBeenCalledWith({ reason: 'suspended' });
    expect(queryClient.getQueryData(['courses', 'list'])).toBeUndefined();
  });

  it('keeps the suspension reason on later redirects to /login (e.g. when guards re-run)', async () => {
    const { fake, context } = setup();
    fake.signIn();
    await fake.controller.signOut({ reason: 'suspended' });
    expect(await outcome(() => requireAuthenticated({ context, location }))).toEqual({
      redirect: expect.objectContaining({
        to: '/login',
        search: { redirect: '/courses?page=2', reason: 'suspended' },
      }),
    });
  });

  it('also signs out when /me reports status "suspended"', async () => {
    const { fake, context, queryClient } = setup();
    fake.signIn();
    queryClient.setQueryData(authKeys.me, me({ status: 'suspended' }));
    expect(await outcome(() => requireAuthenticated({ context, location }))).toEqual({
      redirect: expect.objectContaining({ to: '/login', search: { reason: 'suspended' } }),
    });
    expect(fake.controller.signOut).toHaveBeenCalledOnce();
  });

  it.each([
    [500, { error: 'Internal server error' }],
    [403, { error: 'An email address is required' }],
  ])(
    'lets other /me failures (%i without the suspension code) reach the error screen',
    async (status, body) => {
      const { fake, context } = setup();
      fake.signIn();
      mockMeResponse(status, body);
      const result = await outcome(() => requireAuthenticated({ context, location }));
      expect(result.error).toMatchObject({ name: 'ApiError', status });
      expect(fake.controller.signOut).not.toHaveBeenCalled();
    },
  );
});

describe('requireAdmin (admin layout)', () => {
  it('shows "not allowed" to non-admins (role from /me)', () => {
    expect(() => {
      requireAdmin({ context: { me: me({ role: 'user' }) } });
    }).toThrow(NotAllowedError);
  });

  it('lets administrators in', () => {
    expect(() => {
      requireAdmin({ context: { me: me({ role: 'admin' }) } });
    }).not.toThrow();
  });
});

describe('redirectIfSignedIn (login, sign-up, password reset)', () => {
  it('shows the page to signed-out visitors', async () => {
    const { fake, context } = setup();
    fake.signOutNow();
    expect(await outcome(() => redirectIfSignedIn({ context, search: {} }))).toEqual({
      resolved: undefined,
    });
  });

  it('sends verified users to the return path', async () => {
    const { fake, context } = setup();
    fake.signIn();
    expect(
      await outcome(() => redirectIfSignedIn({ context, search: { redirect: '/account' } })),
    ).toEqual({ redirect: expect.objectContaining({ href: '/account' }) });
  });

  it('never follows an off-site return path', async () => {
    const { fake, context } = setup();
    fake.signIn();
    for (const target of ['//evil.example', 'https://evil.example', '/\\evil.example']) {
      expect(
        await outcome(() => redirectIfSignedIn({ context, search: { redirect: target } })),
      ).toEqual({ redirect: expect.objectContaining({ href: '/' }) });
    }
  });

  it('sends unverified users to email verification, keeping the return path', async () => {
    const { fake, context } = setup();
    fake.signIn(passwordUser({ emailVerified: false }));
    expect(
      await outcome(() => redirectIfSignedIn({ context, search: { redirect: '/account' } })),
    ).toEqual({
      redirect: expect.objectContaining({ to: '/verify-email', search: { redirect: '/account' } }),
    });
  });
});

describe('requireUnverified (/verify-email)', () => {
  it('needs a signed-in user', async () => {
    const { fake, context } = setup();
    fake.signOutNow();
    expect(await outcome(() => requireUnverified({ context, search: {} }))).toEqual({
      redirect: expect.objectContaining({ to: '/login' }),
    });
  });

  it('sends verified users on', async () => {
    const { fake, context } = setup();
    fake.signIn();
    expect(
      await outcome(() => requireUnverified({ context, search: { redirect: '/account' } })),
    ).toEqual({ redirect: expect.objectContaining({ href: '/account' }) });
  });

  it('shows the page to unverified users', async () => {
    const { fake, context } = setup();
    const user = passwordUser({ emailVerified: false });
    fake.signIn(user);
    expect(await outcome(() => requireUnverified({ context, search: {} }))).toEqual({
      resolved: { user },
    });
  });
});
