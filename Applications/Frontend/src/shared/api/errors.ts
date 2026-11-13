/**
 * Typed API errors, following the contract in openapi.yaml (components/schemas/Error):
 * `{ error, code, params?, issues? }`. Components never show `error` (the server's English
 * text): they translate through shared/i18n/error-messages.ts, by `code`, then by HTTP status.
 */

/** One validation problem (components/schemas/ValidationIssue, without the English message). */
export interface ApiIssue {
  /** Field path, e.g. ['title'] or ['questions', 0, 'choices']. */
  path: (string | number)[];
  /** A zod issue code (too_small, invalid_format, ...) or one of ours (CORRECT_CHOICE_REQUIRED). */
  code: string;
  /** Values for the message (minimum, maximum, origin, format, ...). */
  params: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function toIssue(raw: unknown): ApiIssue | null {
  if (!isRecord(raw) || typeof raw.code !== 'string') return null;
  const path = Array.isArray(raw.path)
    ? raw.path.filter((part): part is string | number => ['string', 'number'].includes(typeof part))
    : [];
  return { path, code: raw.code, params: isRecord(raw.params) ? raw.params : {} };
}

/** A non-2xx response from the API. */
export class ApiError extends Error {
  readonly status: number;
  /**
   * Stable error code (e.g. LOCKED). Undefined only when something other than the API answered
   * (a proxy's error page); a bare 429 from a proxy still counts as RATE_LIMITED.
   */
  readonly code: string | undefined;
  readonly params: Record<string, unknown> | undefined;
  /** Field-level validation issues (VALIDATION_FAILED). */
  readonly issues: ApiIssue[];

  constructor(status: number, body: unknown) {
    const data = isRecord(body) ? body : {};
    super(typeof data.error === 'string' ? data.error : `HTTP ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.code =
      typeof data.code === 'string' ? data.code : status === 429 ? 'RATE_LIMITED' : undefined;
    this.params = isRecord(data.params) ? data.params : undefined;
    this.issues = (Array.isArray(data.issues) ? data.issues : [])
      .map(toIssue)
      .filter((issue) => issue !== null);
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
