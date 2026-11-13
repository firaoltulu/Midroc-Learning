import { QueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../shared/api/client';
import { meKeys } from '../../shared/api/query-keys';
import { connectAuth } from './connect-auth';
import { USER_STORAGE_PREFIX } from './lib/user-data';
import { createFakeAuthController, passwordUser } from './testing/fake-auth-controller';

function setup() {
  const fake = createFakeAuthController();
  const queryClient = new QueryClient();
  const onChange = vi.fn();
  const disconnect = connectAuth({ controller: fake.controller, queryClient, onChange });
  return { fake, queryClient, onChange, disconnect };
}

const respond = (headers: Record<string, string> = {}) =>
  vi
    .spyOn(globalThis, 'fetch')
    .mockImplementation(() =>
      Promise.resolve(new Response('{"ok":true}', { status: 200, headers })),
    );

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  sessionStorage.clear();
});

describe('connectAuth', () => {
  it('sends the ID token as a Bearer header', async () => {
    const { fake, disconnect } = setup();
    fake.signIn();
    const fetchSpy = respond();

    await apiRequest('/me');
    const headers = new Headers(fetchSpy.mock.calls[0]?.[1]?.headers);
    expect(headers.get('Authorization')).toBe('Bearer token-1');
    disconnect();
  });

  it('on X-Token-Refresh: forces a new token and refetches /me', async () => {
    const { fake, queryClient, disconnect } = setup();
    fake.signIn();
    queryClient.setQueryData(meKeys.me, { role: 'user' });
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');
    respond({ 'X-Token-Refresh': 'true' });

    await apiRequest('/courses');
    await vi.waitFor(() => {
      expect(fake.controller.getIdToken).toHaveBeenCalledWith(true);
      expect(invalidate).toHaveBeenCalledWith({ queryKey: meKeys.me });
    });
    disconnect();
  });

  it('does nothing extra without the header', async () => {
    const { fake, disconnect } = setup();
    fake.signIn();
    respond();
    await apiRequest('/courses');
    expect(fake.controller.getIdToken).not.toHaveBeenCalledWith(true);
    disconnect();
  });

  it('clears the query cache and per-user data when the session ends', async () => {
    const { fake, queryClient, onChange, disconnect } = setup();
    fake.signIn();
    queryClient.setQueryData(meKeys.me, { role: 'user' });
    localStorage.setItem(`${USER_STORAGE_PREFIX}draft`, 'x');
    localStorage.setItem('midroc.language', 'am');
    sessionStorage.setItem('exam-answers', 'y');

    await fake.controller.signOut();

    expect(queryClient.getQueryData(meKeys.me)).toBeUndefined();
    expect(localStorage.getItem(`${USER_STORAGE_PREFIX}draft`)).toBeNull();
    expect(localStorage.getItem('midroc.language')).toBe('am'); // device preference kept
    expect(sessionStorage.length).toBe(0);
    expect(onChange).toHaveBeenCalled();
    disconnect();
  });

  it('also clears when a different user signs in', () => {
    const { fake, queryClient, disconnect } = setup();
    fake.signIn(passwordUser({ uid: 'a' }));
    queryClient.setQueryData(meKeys.me, { id: 'a' });
    fake.signIn(passwordUser({ uid: 'b' }));
    expect(queryClient.getQueryData(meKeys.me)).toBeUndefined();
    disconnect();
  });

  it('signs out with "session ended" when the token is refused even after a refresh', async () => {
    const { fake, disconnect } = setup();
    fake.signIn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response('{"error":"Invalid authentication token"}', { status: 401 })),
    );

    await expect(apiRequest('/courses')).rejects.toMatchObject({ status: 401 });
    await vi.waitFor(() => {
      expect(fake.controller.signOut).toHaveBeenCalledWith({ reason: 'sessionExpired' });
    });
    expect(fake.controller.getState()).toEqual({ status: 'signedOut', reason: 'sessionExpired' });
    disconnect();
  });

  it('signs out with "suspended" on ACCOUNT_SUSPENDED from any endpoint', async () => {
    const { fake, disconnect } = setup();
    fake.signIn();
    vi.spyOn(globalThis, 'fetch').mockImplementation(() =>
      Promise.resolve(
        new Response('{"error":"Account is suspended","code":"ACCOUNT_SUSPENDED"}', {
          status: 403,
        }),
      ),
    );

    await expect(apiRequest('/courses')).rejects.toMatchObject({ code: 'ACCOUNT_SUSPENDED' });
    await vi.waitFor(() => {
      expect(fake.controller.signOut).toHaveBeenCalledWith({ reason: 'suspended' });
    });
    disconnect();
  });
});
