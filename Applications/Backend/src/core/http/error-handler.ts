import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { config } from '../../config.js';
import { logger } from '../logger.js';
import { AppError } from './app-error.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Validation failed', issues: error.issues });
    return;
  }
  if (error instanceof AppError) {
    const body: Record<string, unknown> = { error: error.message };
    if (error.code) body.code = error.code;
    if (error.details !== undefined) body.issues = error.details;
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
    res.status(tooLarge ? 413 : 400).json({
      error: tooLarge ? 'Uploaded file exceeds the 50 MB limit' : 'Invalid upload'
    });
    return;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'type' in error &&
    error.type === 'entity.parse.failed'
  ) {
    res.status(400).json({ error: 'Malformed JSON request body' });
    return;
  }
  if (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    error.status === 413
  ) {
    res.status(413).json({ error: 'Request body is too large' });
    return;
  }
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = error.code;
    if (code === '23505' || code === '23503' || code === '23514') {
      res.status(409).json({ error: 'The request conflicts with existing data' });
      return;
    }
  }
  logger.error({ err: error }, 'Unhandled request error');
  res.status(500).json({
    error: 'Internal server error',
    ...(config.NODE_ENV !== 'production' ? { detail: String(error) } : {})
  });
};
