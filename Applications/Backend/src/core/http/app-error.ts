export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly details?: unknown
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class BadRequest extends AppError {
  constructor(message = 'Bad request', code?: string) {
    super(message, 400, code);
  }
}

export class Forbidden extends AppError {
  constructor(message = 'Forbidden', code?: string) {
    super(message, 403, code);
  }
}

export class NotFound extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}

export class Conflict extends AppError {
  constructor(message: string, code?: string) {
    super(message, 409, code);
  }
}

export class Gone extends AppError {
  constructor(message = 'Gone', code?: string) {
    super(message, 410, code);
  }
}

export class Unprocessable extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 422, undefined, details);
  }
}

export class BadGateway extends AppError {
  constructor(message = 'Upstream service unavailable') {
    super(message, 502);
  }
}
