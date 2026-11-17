import { env } from '../lib/env';
import { ApiError, NetworkError } from './errors';

/**
 * The one HTTP client for the backend. Every request:
 * - goes to `VITE_API_BASE` + path, JSON in and out;
 * - carries `Authorization: Bearer <ID token>` (the Firebase SDK caches and refreshes it);
 * - on 401, force-refreshes the token and retries once; if that fails too, the user is signed
 *   out (`onUnauthorized`);
 * - on `X-Token-Refresh: true` (role changed), triggers `onTokenRefresh`;
 * - on 403 `ACCOUNT_SUSPENDED`, triggers `onAccountSuspended`;
 * - throws a typed `ApiError` (non-2xx) or `NetworkError` (no response).
 * Features call it from their api/ query options and mutations, never from components.
 */

export { ApiError, NetworkError, type ApiIssue } from './errors';

export interface ApiAuth {
  /** Current user's ID token, or null when signed out. `force` bypasses the SDK cache. */
  getToken: (force?: boolean) => Promise<string | null>;
  /** A response carried `X-Token-Refresh: true` (the role claim changed). */
  onTokenRefresh: () => void | Promise<void>;
  /** The token was refused even after a forced refresh: the session is over. */
  onUnauthorized: () => void | Promise<void>;
  /** The backend refused the request because the account is suspended. */
  onAccountSuspended: () => void | Promise<void>;
}

let auth: ApiAuth | null = null;

/** Wired by the auth feature once at startup. */
export function configureApiAuth(value: ApiAuth | null) {
  auth = value;
  forcedRefresh = null;
}

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** JSON-serialized; FormData is sent as is. */
  body?: unknown;
  /** Query string; undefined, null and '' are left out, arrays repeat the key. */
  query?: Record<string, QueryValue | readonly QueryValue[]>;
  signal?: AbortSignal;
  /** Lets a request outlive the page (progress saved on page hide). */
  keepalive?: boolean;
  /** HTTP cache mode; React Query owns API caching for requests that opt out of browser caching. */
  cache?: RequestCache;
}

/** Builds the absolute request URL (absolute so it also works outside a browser, in tests). */
export function apiUrl(path: string, query?: RequestOptions['query']): string {
  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const url = new URL(`${env.VITE_API_BASE}${path}`, origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    const values: readonly QueryValue[] = Array.isArray(value) ? value : [value as QueryValue];
    for (const item of values) {
      if (item !== undefined && item !== null && item !== '') {
        url.searchParams.append(key, String(item));
      }
    }
  }
  return url.toString();
}

// Concurrent 401s share one forced refresh.
let forcedRefresh: Promise<string | null> | null = null;

function refreshToken(): Promise<string | null> {
  forcedRefresh ??= Promise.resolve(auth?.getToken(true) ?? null).finally(() => {
    forcedRefresh = null;
  });
  return forcedRefresh;
}

function notify(callback: (() => void | Promise<void>) | undefined) {
  // Never block or fail the caller on a side effect.
  void Promise.resolve()
    .then(callback)
    .catch(() => undefined);
}

async function send(url: string, options: RequestOptions, token: string | null) {
  const headers = new Headers({ Accept: 'application/json' });
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const isForm = options.body instanceof FormData;
  if (options.body !== undefined && !isForm) headers.set('Content-Type', 'application/json');

  try {
    return await fetch(url, {
      method: options.method ?? 'GET',
      headers,
      body:
        options.body === undefined
          ? undefined
          : isForm
            ? (options.body as FormData)
            : JSON.stringify(options.body),
      signal: options.signal,
      keepalive: options.keepalive,
      cache: options.cache,
    });
  } catch (error) {
    // Cancellation is not a failure; let TanStack Query see the AbortError.
    if (options.signal?.aborted) throw error;
    throw new NetworkError({ cause: error });
  }
}

/** Sends the request with auth, the 401 retry and response signals; throws on non-2xx. */
async function fetchApi(path: string, options: RequestOptions): Promise<Response> {
  const url = apiUrl(path, options.query);
  const token = (await auth?.getToken()) ?? null;
  let response = await send(url, options, token);

  if (response.status === 401 && token) {
    let fresh: string | null = null;
    try {
      fresh = await refreshToken();
    } catch {
      // The SDK could not refresh (revoked session, disabled user): treat as signed out.
    }
    if (fresh) response = await send(url, options, fresh);
    if (!fresh || response.status === 401) notify(auth?.onUnauthorized);
  }

  if (response.headers.get('X-Token-Refresh') === 'true') notify(auth?.onTokenRefresh);

  if (!response.ok) {
    const error = new ApiError(response.status, await readBody(response));
    if (error.status === 403 && error.code === 'ACCOUNT_SUSPENDED') {
      notify(auth?.onAccountSuspended);
    }
    throw error;
  }
  return response;
}

/** A JSON request. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  return (await readBody(await fetchApi(path, options))) as T;
}

/**
 * A JSON request that also returns the response headers and when the response arrived, e.g.
 * to correct for clock skew with the `Date` header (same-origin API, so it is readable).
 */
export async function apiRequestWithMeta(
  path: string,
  options: RequestOptions = {},
): Promise<{ data: unknown; headers: Headers; receivedAt: number }> {
  const response = await fetchApi(path, options);
  const receivedAt = Date.now();
  return { data: await readBody(response), headers: response.headers, receivedAt };
}

/**
 * A binary download with the auth header (e.g. a PDF: a plain link can't carry the token).
 * Not cached by the browser; the caller owns the Blob.
 */
export async function apiBlob(
  path: string,
  options: Pick<RequestOptions, 'signal'> = {},
): Promise<Blob> {
  return (await fetchApi(path, options)).blob();
}

export interface UploadOptions {
  /** Fraction sent so far, 0–1. */
  onProgress?: (fraction: number) => void;
  signal?: AbortSignal;
}

/**
 * A multipart upload with progress (fetch can't report upload progress, so this uses
 * XMLHttpRequest). Same auth, 401 retry, suspension handling and typed errors as apiRequest.
 */
export async function apiUpload(
  path: string,
  body: FormData,
  options: UploadOptions = {},
): Promise<unknown> {
  const url = apiUrl(path);
  const token = (await auth?.getToken()) ?? null;
  let result = await sendXhr(url, body, token, options);

  if (result.status === 401 && token) {
    let fresh: string | null = null;
    try {
      fresh = await refreshToken();
    } catch {
      // Treated as signed out below.
    }
    if (fresh) result = await sendXhr(url, body, fresh, options);
    if (!fresh || result.status === 401) notify(auth?.onUnauthorized);
  }

  if (result.tokenRefresh) notify(auth?.onTokenRefresh);
  const data = parseJson(result.text);
  if (result.status < 200 || result.status >= 300) {
    const error = new ApiError(result.status, data);
    if (error.status === 403 && error.code === 'ACCOUNT_SUSPENDED') {
      notify(auth?.onAccountSuspended);
    }
    throw error;
  }
  return data;
}

function sendXhr(
  url: string,
  body: FormData,
  token: string | null,
  { onProgress, signal }: UploadOptions,
): Promise<{ status: number; text: string; tokenRefresh: boolean }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Upload cancelled', 'AbortError'));
      return;
    }
    const xhr = new XMLHttpRequest();
    xhr.open('POST', url);
    xhr.setRequestHeader('Accept', 'application/json');
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) onProgress?.(event.loaded / event.total);
    };
    xhr.onload = () => {
      resolve({
        status: xhr.status,
        text: xhr.responseText,
        tokenRefresh: xhr.getResponseHeader('X-Token-Refresh') === 'true',
      });
    };
    xhr.onerror = () => {
      reject(new NetworkError());
    };
    xhr.onabort = () => {
      reject(new DOMException('Upload cancelled', 'AbortError'));
    };
    signal?.addEventListener('abort', () => {
      xhr.abort();
    });
    xhr.send(body);
  });
}

function parseJson(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Non-JSON bodies (e.g. a proxy's HTML error page) carry nothing we can use.
    return undefined;
  }
}

async function readBody(response: Response): Promise<unknown> {
  return response.status === 204 ? undefined : parseJson(await response.text());
}
