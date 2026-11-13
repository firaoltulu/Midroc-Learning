/**
 * Errors with a stable, machine-readable `code` (clients translate by code, never by message)
 * and optional `params` for the client's message. Response body:
 *   { error: <English message for developers>, code, params? }
 * Each class has a generic default code; pass a specific one where the client can act on it.
 */
export type ErrorParams = Record<string, unknown>;

export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly params?: ErrorParams
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequest extends AppError {
  constructor(message = 'Bad request', code = 'BAD_REQUEST', params?: ErrorParams) {
    super(message, 400, code, params);
  }
}

export class Forbidden extends AppError {
  constructor(message = 'Forbidden', code = 'FORBIDDEN', params?: ErrorParams) {
    super(message, 403, code, params);
  }
}

export class NotFound extends AppError {
  constructor(message = 'Not found', code = 'NOT_FOUND', params?: ErrorParams) {
    super(message, 404, code, params);
  }
}

export class Conflict extends AppError {
  constructor(message: string, code = 'CONFLICT', params?: ErrorParams) {
    super(message, 409, code, params);
  }
}

export class Gone extends AppError {
  constructor(message = 'Gone', code = 'GONE', params?: ErrorParams) {
    super(message, 410, code, params);
  }
}

export class Unprocessable extends AppError {
  constructor(message: string, code = 'UNPROCESSABLE', params?: ErrorParams) {
    super(message, 422, code, params);
  }
}

export class BadGateway extends AppError {
  constructor(message = 'Upstream service unavailable', code = 'UPSTREAM_UNAVAILABLE') {
    super(message, 502, code);
  }
}

/** A path parameter that is not a valid id. */
export const invalidParameter = (name: string) =>
  new BadRequest(`Invalid ${name}`, 'INVALID_PARAMETER', { name });
