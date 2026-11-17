import { http, HttpResponse } from 'msw';
import { api, apiError, server } from '../../test/msw';
import { apiRequest, apiUpload, configureApiAuth, type ApiAuth } from './client';
import { ApiError, NetworkError } from './errors';

/** A token provider whose forced refresh returns a new token. */
function fakeAuth(overrides: Partial<ApiAuth> = {}) {
  const auth = {
    getToken: vi.fn((force?: boolean) => Promise.resolve(force ? 'fresh-token' : 'old-token')),
    onTokenRefresh: vi.fn(),
    onUnauthorized: vi.fn(),
    onAccountSuspended: vi.fn(),
    ...overrides,
  };
  configureApiAuth(auth);
  return auth;
}

/** Records the Authorization header of each request to `path`, answering with `respond`. */
function recordAuthorization(
  path: string,
  respond: (authorization: string | null) => Response,
  method: 'get' | 'post' = 'get',
) {
  const seen: (string | null)[] = [];
  server.use(
    http[method](api(path), ({ request }) => {
      const authorization = request.headers.get('authorization');
      seen.push(authorization);
      return respond(authorization);
    }),
  );
  return seen;
}

/** Lets fire-and-forget callbacks (notify) run. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

afterEach(() => {
  configureApiAuth(null);
});

describe('apiRequest', () => {
  it('sends the Bearer token, JSON body and query string', async () => {
    fakeAuth();
    const requests: { url: URL; auth: string | null; type: string | null; body: unknown }[] = [];
    server.use(
      http.post(api('/courses'), async ({ request }) => {
        requests.push({
          url: new URL(request.url),
          auth: request.headers.get('authorization'),
          type: request.headers.get('content-type'),
          body: await request.json(),
        });
        return HttpResponse.json({ id: 'c1' }, { status: 201 });
      }),
    );

    const result = await apiRequest('/courses', {
      method: 'POST',
      body: { title: 'Safety basics' },
      query: { draft: true, skip: undefined, empty: '', tags: ['a', 'b'] },
    });

    expect(result).toEqual({ id: 'c1' });
    const [received] = requests;
    expect(received).toMatchObject({
      auth: 'Bearer old-token',
      type: 'application/json',
      body: { title: 'Safety basics' },
    });
    expect(received?.url.pathname).toBe('/api/courses');
    expect(received?.url.search).toBe('?draft=true&tags=a&tags=b');
  });

  it('sends no Authorization header when signed out', async () => {
    fakeAuth({ getToken: vi.fn(() => Promise.resolve(null)) });
    const seen = recordAuthorization('/courses', () => HttpResponse.json({ items: [] }));
    await apiRequest('/courses');
    expect(seen).toEqual([null]);
  });

  it('uses the requested browser cache mode', async () => {
    fakeAuth();
    server.use(http.get(api('/courses/c1'), () => HttpResponse.json({ id: 'c1' })));
    const fetchImpl = globalThis.fetch;
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation((input, init) => fetchImpl(input, init));

    try {
      await apiRequest('/courses/c1', { cache: 'no-store' });
      expect(fetchSpy.mock.calls[0]?.[1]?.cache).toBe('no-store');
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('returns undefined for 204 No Content', async () => {
    fakeAuth();
    server.use(http.delete(api('/courses/c1'), () => new HttpResponse(null, { status: 204 })));
    await expect(apiRequest('/courses/c1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('401: refresh the token and retry once', () => {
  it('retries with a force-refreshed token and returns the result', async () => {
    const auth = fakeAuth();
    const seen = recordAuthorization('/me', (authorization) =>
      authorization === 'Bearer fresh-token'
        ? HttpResponse.json({ id: 'u1' })
        : apiError(401, { error: 'Invalid authentication token' }),
    );

    await expect(apiRequest('/me')).resolves.toEqual({ id: 'u1' });
    expect(seen).toEqual(['Bearer old-token', 'Bearer fresh-token']);
    expect(auth.getToken).toHaveBeenLastCalledWith(true);
    expect(auth.onUnauthorized).not.toHaveBeenCalled();
  });

  it('signs out when the refreshed token is refused too (no third attempt)', async () => {
    const auth = fakeAuth();
    const seen = recordAuthorization('/me', () => apiError(401));

    const error = await apiRequest('/me').catch((thrown: unknown) => thrown);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401 });
    expect(seen).toHaveLength(2);
    await flush();
    expect(auth.onUnauthorized).toHaveBeenCalledOnce();
  });

  it('signs out when the token cannot be refreshed', async () => {
    const auth = fakeAuth({
      getToken: vi.fn((force?: boolean) =>
        force ? Promise.reject(new Error('auth/user-token-expired')) : Promise.resolve('old-token'),
      ),
    });
    const seen = recordAuthorization('/me', () => apiError(401));

    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 401 });
    expect(seen).toHaveLength(1);
    await flush();
    expect(auth.onUnauthorized).toHaveBeenCalledOnce();
  });

  it('shares one forced refresh between concurrent 401s', async () => {
    const auth = fakeAuth();
    recordAuthorization('/me', (authorization) =>
      authorization === 'Bearer fresh-token' ? HttpResponse.json({ ok: true }) : apiError(401),
    );

    await Promise.all([apiRequest('/me'), apiRequest('/me'), apiRequest('/me')]);
    expect(vi.mocked(auth.getToken).mock.calls.filter(([force]) => force === true)).toHaveLength(1);
  });

  it('does not retry a 401 for a signed-out request', async () => {
    const auth = fakeAuth({ getToken: vi.fn(() => Promise.resolve(null)) });
    const seen = recordAuthorization('/me', () => apiError(401));
    await expect(apiRequest('/me')).rejects.toMatchObject({ status: 401 });
    expect(seen).toHaveLength(1);
    await flush();
    expect(auth.onUnauthorized).not.toHaveBeenCalled();
  });
});

describe('response signals', () => {
  it('X-Token-Refresh: true triggers a token refresh without failing the request', async () => {
    const auth = fakeAuth();
    server.use(
      http.get(api('/me'), () =>
        HttpResponse.json({ role: 'admin' }, { headers: { 'X-Token-Refresh': 'true' } }),
      ),
    );
    await expect(apiRequest('/me')).resolves.toEqual({ role: 'admin' });
    await flush();
    expect(auth.onTokenRefresh).toHaveBeenCalledOnce();
  });

  it('403 ACCOUNT_SUSPENDED from any endpoint reports the suspension', async () => {
    const auth = fakeAuth();
    server.use(
      http.get(api('/courses'), () =>
        apiError(403, { error: 'Account is suspended', code: 'ACCOUNT_SUSPENDED' }),
      ),
    );
    await expect(apiRequest('/courses')).rejects.toMatchObject({
      status: 403,
      code: 'ACCOUNT_SUSPENDED',
    });
    await flush();
    expect(auth.onAccountSuspended).toHaveBeenCalledOnce();
  });

  it('other 403s do not', async () => {
    const auth = fakeAuth();
    server.use(http.get(api('/admin/users'), () => apiError(403)));
    await expect(apiRequest('/admin/users')).rejects.toMatchObject({ status: 403 });
    await flush();
    expect(auth.onAccountSuspended).not.toHaveBeenCalled();
  });
});

describe('typed errors', () => {
  it('builds an ApiError from the error contract', async () => {
    fakeAuth();
    server.use(
      http.put(api('/items/i1/progress'), () =>
        apiError(409, { error: 'Course is locked', code: 'LOCKED', params: { status: 'x' } }),
      ),
    );
    const error = await apiRequest('/items/i1/progress', { method: 'PUT', body: {} }).catch(
      (thrown: unknown) => thrown,
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: 'LOCKED', params: { status: 'x' } });
  });

  it('reads validation issues (VALIDATION_FAILED), dropping the English message', async () => {
    fakeAuth();
    server.use(
      http.post(api('/courses'), () =>
        HttpResponse.json(
          {
            error: 'Validation failed',
            code: 'VALIDATION_FAILED',
            issues: [
              {
                path: ['title'],
                code: 'too_small',
                message: 'Too small: expected string to have >=3 characters',
                params: { origin: 'string', minimum: 3, inclusive: true },
              },
              { path: [0, 'choices'], code: 'CORRECT_CHOICE_REQUIRED', message: 'x', params: {} },
            ],
          },
          { status: 400 },
        ),
      ),
    );
    const error = (await apiRequest('/courses', { method: 'POST', body: {} }).catch(
      (thrown: unknown) => thrown,
    )) as ApiError;
    expect(error.code).toBe('VALIDATION_FAILED');
    expect(error.issues).toEqual([
      {
        path: ['title'],
        code: 'too_small',
        params: { origin: 'string', minimum: 3, inclusive: true },
      },
      { path: [0, 'choices'], code: 'CORRECT_CHOICE_REQUIRED', params: {} },
    ]);
  });

  it('reads params, e.g. the problems of COURSE_INCOMPLETE', () => {
    const error = new ApiError(422, {
      error: 'Course is incomplete',
      code: 'COURSE_INCOMPLETE',
      params: { problems: ['DESCRIPTION_REQUIRED', 'NO_MODULES'] },
    });
    expect(error.params).toEqual({ problems: ['DESCRIPTION_REQUIRED', 'NO_MODULES'] });
  });

  it('a 429 with a plain-text body is RATE_LIMITED', async () => {
    fakeAuth();
    server.use(
      http.get(
        api('/courses'),
        () => new HttpResponse('Too many requests, please try again later.', { status: 429 }),
      ),
    );
    await expect(apiRequest('/courses')).rejects.toMatchObject({
      status: 429,
      code: 'RATE_LIMITED',
    });
  });

  it('a non-JSON error page still gives an ApiError with the status', async () => {
    fakeAuth();
    server.use(
      http.get(
        api('/courses'),
        () => new HttpResponse('<html>Bad gateway</html>', { status: 502 }),
      ),
    );
    await expect(apiRequest('/courses')).rejects.toMatchObject({ status: 502, code: undefined });
  });

  it('a failed connection is a NetworkError', async () => {
    fakeAuth();
    server.use(http.get(api('/courses'), () => HttpResponse.error()));
    await expect(apiRequest('/courses')).rejects.toBeInstanceOf(NetworkError);
  });

  it('cancellation stays an abort, not a NetworkError', async () => {
    fakeAuth();
    server.use(
      http.get(api('/courses'), async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const request = apiRequest('/courses', { signal: controller.signal });
    controller.abort();
    const error = await request.catch((thrown: unknown) => thrown);
    expect(error).not.toBeInstanceOf(NetworkError);
    expect(error).toMatchObject({ name: 'AbortError' });
  });
});

describe('apiUpload (XMLHttpRequest, for upload progress)', () => {
  const form = () => {
    const body = new FormData();
    body.append('file', new File(['%PDF-1.4'], 'a.pdf', { type: 'application/pdf' }));
    return body;
  };

  it('sends the Bearer token and returns the JSON response', async () => {
    fakeAuth();
    const seen = recordAuthorization(
      '/pdf-uploads',
      () => HttpResponse.json({ fileKey: 'k.pdf' }, { status: 201 }),
      'post',
    );
    await expect(apiUpload('/pdf-uploads', form())).resolves.toEqual({ fileKey: 'k.pdf' });
    expect(seen).toEqual(['Bearer old-token']);
  });

  it('retries a 401 once with a refreshed token', async () => {
    fakeAuth();
    const seen = recordAuthorization(
      '/pdf-uploads',
      (authorization) =>
        authorization === 'Bearer fresh-token'
          ? HttpResponse.json({ fileKey: 'k.pdf' }, { status: 201 })
          : apiError(401),
      'post',
    );
    await expect(apiUpload('/pdf-uploads', form())).resolves.toEqual({ fileKey: 'k.pdf' });
    expect(seen).toEqual(['Bearer old-token', 'Bearer fresh-token']);
  });

  it('throws the typed error from the error contract', async () => {
    fakeAuth();
    server.use(
      http.post(api('/pdf-uploads'), () =>
        apiError(413, { code: 'PDF_TOO_LARGE', params: { maxMegabytes: 50 } }),
      ),
    );
    const error = await apiUpload('/pdf-uploads', form()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 413,
      code: 'PDF_TOO_LARGE',
      params: { maxMegabytes: 50 },
    });
  });

  it('a failed connection is a NetworkError', async () => {
    fakeAuth();
    server.use(http.post(api('/pdf-uploads'), () => HttpResponse.error()));
    await expect(apiUpload('/pdf-uploads', form())).rejects.toBeInstanceOf(NetworkError);
  });
});
