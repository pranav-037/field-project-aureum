/**
 * Custom application error classes
 */

export class AuthorizationError extends Error {
  public readonly statusCode = 403;

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
    Object.setPrototypeOf(this, AuthorizationError.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }
}

export class AuthenticationError extends Error {
  public readonly statusCode = 401;

  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}

export class ConflictError extends Error {
  public readonly statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConflictError);
    }
  }
}
