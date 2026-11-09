/**
 * Custom application error classes.
 * Centralised here so all modules can import from one place.
 */

/** Thrown when an authenticated user attempts an action they are not permitted to perform. */
export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
    // Maintains proper stack trace in V8-based environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthorizationError);
    }
  }
}

/** Thrown when a request cannot be authenticated (missing / invalid token). */
export class AuthenticationError extends Error {
  constructor(message = 'Unauthorized') {
    super(message);
    this.name = 'AuthenticationError';
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthenticationError);
    }
  }
}
