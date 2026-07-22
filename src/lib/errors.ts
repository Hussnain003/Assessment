/**
 * Application error hierarchy.
 *
 * Services and repositories throw these — never HTTP responses — so business
 * logic stays free of transport concerns. The route boundary (see http.ts) is
 * the single place that turns an AppError into an HTTP status + JSON body.
 */

export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INTERNAL_ERROR";

export abstract class AppError extends Error {
  abstract readonly status: number;
  abstract readonly code: ErrorCode;

  /** Optional machine-readable extra context (e.g. Zod issues). */
  readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    // Name the error after the concrete subclass for readable stack traces.
    this.name = new.target.name;
    this.details = details;
  }
}

/** 422 — input failed validation at the API boundary. */
export class ValidationError extends AppError {
  readonly status = 422;
  readonly code = "VALIDATION_ERROR" as const;
}

/** 401 — no valid session on the request. */
export class UnauthorizedError extends AppError {
  readonly status = 401;
  readonly code = "UNAUTHORIZED" as const;
}

/** 403 — the resource exists and is visible, but the caller may not act on it. */
export class ForbiddenError extends AppError {
  readonly status = 403;
  readonly code = "FORBIDDEN" as const;
}

/** 404 — the resource does not exist, or is not visible to this tenant. */
export class NotFoundError extends AppError {
  readonly status = 404;
  readonly code = "NOT_FOUND" as const;
}
