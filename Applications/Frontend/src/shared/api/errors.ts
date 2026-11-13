/**
 * Typed API errors. Components never show `message` (the server's English text): they translate
 * through shared/i18n/error-messages.ts, by `code`, then by HTTP status.
 */

/** One validation problem, normalized from the backend's issue format. */
export interface ApiIssue {
  /** Field path, e.g. ['title'] or ['questions', 0, 'choices', 1, 'text']. */
  path: (string | number)[];
  /** Validation code (zod issue codes from the backend: too_small, invalid_format, ...). */
  code: string;
  /** Values for the message (minimum, maximum, origin, format, ...). */
  params: Record<string, unknown>;
}

/**
 * Codes the backend sends under another name than the spec. The spec's name is the one we
 * translate.
 */
const CODE_ALIASES: Record<string, string> = {
  TIME_EXCEEDED: 'EXAM_TIME_EXCEEDED',
  STALE: 'STALE_REVISION',
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Issue fields that are not message values (`message` is the server's English text). */
const NOT_PARAMS = new Set(['code', 'path', 'message', 'input', 'params']);

/**
 * Accepts both shapes: the spec's `{ path, code, params }` and the backend's raw zod issues
 * (`{ path, code, message, minimum, origin, ... }`, values inline). Drops the English `message`.
 */
function normalizeIssue(raw: unknown): ApiIssue | null {
  if (!isRecord(raw) || typeof raw.code !== 'string') return null;
  const path = Array.isArray(raw.path)
    ? raw.path.filter((part): part is string | number => ['string', 'number'].includes(typeof part))
    : [];
  const inline = Object.fromEntries(Object.entries(raw).filter(([key]) => !NOT_PARAMS.has(key)));
  return { path, code: raw.code, params: isRecord(raw.params) ? raw.params : inline };
}

/** A non-2xx response from the API. */
export class ApiError extends Error {
  readonly status: number;
  /** Stable error code (e.g. LOCKED), aliases resolved. Undefined when the server sent none. */
  readonly code: string | undefined;
  readonly params: Record<string, unknown> | undefined;
  /** Field-level validation issues (from `issues` objects). */
  readonly issues: ApiIssue[];
  /** `issues` entries that are not field issues (e.g. a list of problems), as sent. */
  readonly details: unknown[];

  constructor(status: number, body: unknown) {
    const data = isRecord(body) ? body : {};
    super(typeof data.error === 'string' ? data.error : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    const code = typeof data.code === 'string' ? data.code : status === 429 ? 'RATE_LIMITED' : '';
    this.code = code ? (CODE_ALIASES[code] ?? code) : undefined;
    this.params = isRecord(data.params) ? data.params : undefined;
    const rawIssues: unknown[] = Array.isArray(data.issues) ? data.issues : [];
    this.issues = rawIssues.map(normalizeIssue).filter((issue) => issue !== null);
    this.details = rawIssues.filter((issue) => normalizeIssue(issue) === null);
  }
}

/** The request never got an HTTP response (offline, DNS, CORS, connection reset). */
export class NetworkError extends Error {
  constructor(options?: { cause?: unknown }) {
    super('Network request failed', options);
    this.name = 'NetworkError';
  }
}

export const isApiError = (error: unknown, code?: string): error is ApiError =>
  error instanceof ApiError && (code === undefined || error.code === code);

export const isNetworkError = (error: unknown): error is NetworkError =>
  error instanceof NetworkError;

/** Worth retrying automatically: network failures and server errors, never 4xx. */
export const isTransientError = (error: unknown): boolean =>
  isNetworkError(error) || (error instanceof ApiError && error.status >= 500);
