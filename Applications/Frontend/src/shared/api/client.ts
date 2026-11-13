import { env } from '../lib/env';

/**
 * Typed HTTP client for the backend. Phase 4 scope: base URL, JSON, a Bearer token on every
 * request, `X-Token-Refresh` handling and a typed ApiError. Phase 5 adds the 401
 * refresh-and-retry, NetworkError and the error-code -> message mapping.
 */

export interface ApiIssue {
  path: (string | number)[];
  code: string;
  params?: Record<string, unknown>;
}

/** Non-2xx response. `code` is the stable identifier to translate; never show `message`. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly params: Record<string, unknown> | undefined;
  readonly issues: ApiIssue[] | undefined;

  constructor(status: number, body: unknown) {
    const data = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
    super(typeof data.error === 'string' ? data.error : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof data.code === 'string' ? data.code : undefined;
    this.params =
      typeof data.params === 'object' && data.params !== null
        ? (data.params as Record<string, unknown>)
        : undefined;
    this.issues = Array.isArray(data.issues) ? (data.issues as ApiIssue[]) : undefined;
  }
}

export interface ApiAuth {
  /** Current user's ID token, or null when signed out. `force` bypasses the SDK cache. */
  getToken: (force?: boolean) => Promise<string | null>;
  /** Called when a response carries `X-Token-Refresh: true` (role claim changed). */
  onTokenRefresh: () => void | Promise<void>;
}

let auth: ApiAuth | null = null;

/** Wired by the auth feature once at startup. */
export function configureApiAuth(value: ApiAuth | null) {
  auth = value;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers({ Accept: 'application/json' });
  const token = await auth?.getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${env.VITE_API_BASE}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  });

  if (response.headers.get('X-Token-Refresh') === 'true') {
    // Don't block the caller on the refresh; the next request uses the new token.
    void Promise.resolve(auth?.onTokenRefresh()).catch(() => undefined);
  }

  const text = await response.text();
  const body: unknown = text ? safeJson(text) : undefined;
  if (!response.ok) throw new ApiError(response.status, body);
  return body as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
