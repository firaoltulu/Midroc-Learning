import type { i18n as I18n } from 'i18next';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ApiError, isNetworkError, type ApiIssue } from '../api/errors';

/**
 * Turns API errors into translated text. Never shows the server's own (English) message.
 *
 * Error:  `errors:codes.<CODE>` (with the error's params) → by HTTP status `errors:http.<kind>`
 *         → `errors:generic`. A NetworkError → `errors:network`.
 * Issue:  `validation:<code>.<origin|format>` → `validation:<code>.default` →
 *         `validation:fallback`.
 */

export interface MessageDescriptor {
  /** Fully qualified key, e.g. 'errors:codes.LOCKED'. */
  key: string;
  values?: Record<string, unknown>;
}

function httpKind(status: number): string | null {
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 410) return 'gone';
  if (status === 413) return 'payloadTooLarge';
  if (status === 422) return 'unprocessable';
  if (status === 502 || status === 503 || status === 504) return 'unavailable';
  if (status >= 500) return 'server';
  if (status === 400) return 'badRequest';
  return null;
}

/** Candidate keys for an error, most specific first (the last always exists). */
export function errorMessageCandidates(error: unknown): MessageDescriptor[] {
  if (isNetworkError(error)) return [{ key: 'errors:network' }];
  if (!(error instanceof ApiError)) return [{ key: 'errors:generic' }];

  const candidates: MessageDescriptor[] = [];
  if (error.code) candidates.push({ key: `errors:codes.${error.code}`, values: error.params });
  if (error.status === 400 && error.issues.length > 0) {
    candidates.push({ key: 'errors:invalidInput' });
  }
  const kind = httpKind(error.status);
  if (kind) candidates.push({ key: `errors:http.${kind}` });
  candidates.push({ key: 'errors:generic' });
  return candidates;
}

/** Candidate keys for one validation issue, most specific first. */
export function issueMessageCandidates(issue: ApiIssue): MessageDescriptor[] {
  const params = issue.params;
  const variant =
    typeof params.origin === 'string'
      ? params.origin
      : typeof params.format === 'string'
        ? params.format
        : undefined;
  // `count` drives plurals ("at least 1 character" / "at least 3 characters").
  const bound = params.minimum ?? params.maximum;
  const values = typeof bound === 'number' ? { ...params, count: bound } : params;
  return [
    ...(variant ? [{ key: `validation:${issue.code}.${variant}`, values }] : []),
    { key: `validation:${issue.code}.default`, values },
    { key: 'validation:fallback' },
  ];
}

type Translate = (key: string, values?: Record<string, unknown>) => string;

function resolve(i18n: I18n, candidates: MessageDescriptor[]): string {
  const found = candidates.find(({ key, values }) => i18n.exists(key, values)) ?? candidates.at(-1);
  const { key, values } = found ?? { key: 'errors:generic' };
  // Keys are dynamic (checked to exist above), so the typed t() can't verify them.
  return (i18n.t as unknown as Translate)(key, values);
}

export function translateError(i18n: I18n, error: unknown): string {
  return resolve(i18n, errorMessageCandidates(error));
}

export function translateIssue(i18n: I18n, issue: ApiIssue): string {
  return resolve(i18n, issueMessageCandidates(issue));
}

/**
 * `const message = useErrorMessage(); message(error)` → translated text for the UI.
 * Re-renders (and the function changes) when the language changes.
 */
export function useErrorMessage() {
  const { i18n } = useTranslation(['errors', 'validation']);
  const language = i18n.language;
  return useCallback(
    (error: unknown) => (language ? translateError(i18n, error) : ''),
    [i18n, language],
  );
}

/** Translated text for one validation issue (e.g. in a form-level summary). */
export function useIssueMessage() {
  const { i18n } = useTranslation(['errors', 'validation']);
  const language = i18n.language;
  return useCallback(
    (issue: ApiIssue) => (language ? translateIssue(i18n, issue) : ''),
    [i18n, language],
  );
}
