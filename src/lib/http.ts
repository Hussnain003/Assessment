import { NextResponse } from "next/server";

import { AppError } from "./errors";

/**
 * The single error envelope every endpoint returns. Keeping one shape means
 * clients can parse failures uniformly regardless of which route produced them.
 */
interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/** Success helper, so success responses are created the same way everywhere. */
export function jsonOk<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status });
}

/**
 * Converts any thrown value into a consistent JSON error response. Known
 * AppErrors map to their status + code; anything else becomes a generic 500 so
 * we never leak stack traces, SQL, or other internals to the client.
 */
export function toErrorResponse(error: unknown): NextResponse<ErrorBody> {
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      },
      { status: error.status },
    );
  }

  // Unexpected — log server-side, return an opaque 500.
  console.error("Unhandled error:", error);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "Something went wrong." } },
    { status: 500 },
  );
}
