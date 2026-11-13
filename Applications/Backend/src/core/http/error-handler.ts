import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { config } from '../../config.js';
import { logger } from '../logger.js';
import { AppError } from './app-error.js';

/**
 * Every error response is `{ error, code, params?, issues? }`:
 * - `error`: English text for developers and logs; clients never show it.
 * - `code`: stable identifier clients translate (see openapi.yaml, components/schemas/Error).
 * - `issues` (VALIDATION_FAILED): `{ path, code, message, params }` per invalid field, where
 *   `code` is the zod issue code (too_small, invalid_format, ...) or, for rules of our own,
 *   a specific code such as CORRECT_CHOICE_REQUIRED.
 */

export interface ValidationIssue {
  path: (string | number)[];
  code: string;
  message: string;
  params: Record<string, unknown>;
}

/** Issue fields that are not message parameters. */
const NOT_PARAMS = new Set(['code', 'path', 'message', 'input', 'params', 'errors', 'inst']);

function toJsonValue(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value instanceof RegExp) return value.source;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export function toValidationIssue(issue: ZodError['issues'][number]): ValidationIssue {
  const raw = issue as unknown as Record<string, unknown>;
  const custom = issue.code === 'custom' ? (issue.params as Record<string, unknown> | undefined) : undefined;
  const params = Object.fromEntries(
    Object.entries(raw)
      .filter(([key, value]) => !NOT_PARAMS.has(key) && typeof value !== 'function')
      .map(([key, value]) => [key, toJsonValue(value)])
  );
  return {
    path: issue.path.map((part) => (typeof part === 'number' ? part : String(part))),
    code: typeof custom?.code === 'string' ? custom.code : issue.code,
    message: issue.message,
    params
  };
}

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_FAILED',
      issues: error.issues.map(toValidationIssue)
    });
    return;
  }
  if (error instanceof AppError) {
    const body: Record<string, unknown> = { error: error.message, code: error.code };
    if (error.params !== undefined) body.params = error.params;
    res.status(error.status).json(body);
    return;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'MulterError' &&
    'code' in error
  ) {
    const tooLarge = error.code === 'LIMIT_FILE_SIZE';
    res.status(tooLarge ? 413 : 400).json(
      tooLarge
        ? {
            error: 'Uploaded file exceeds the 50 MB limit',
            code: 'PDF_TOO_LARGE',
            params: { maxMegabytes: 50 }
          }
        : { error: 'Invalid upload', code: 'INVALID_UPLOAD' }
    );
    return;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    res.status(400).json({ error: 'Malformed JSON request body', code: 'MALFORMED_JSON' });
    return;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 413
  ) {
    res.status(413).json({ error: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (code === '23505' || code === '23503' || code === '23514') {
      res.status(409).json({ error: 'The request conflicts with existing data', code: 'CONFLICT' });
      return;
    }
  }
  logger.error({ err: error }, 'Unhandled request error');
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
    ...(config.NODE_ENV !== 'production' ? { detail: String(error) } : {})
  });
};
