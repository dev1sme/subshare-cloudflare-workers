import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiFailure, ApiSuccess, ErrorDetails } from "../shared/types";
import { ValidationError, assertErrorCode, validationDetails } from "./validate";

// The only place in src/server/ that calls c.json — every response goes through here.

function meta() {
  return { timestamp: Math.floor(Date.now() / 1000) };
}

export function ok<T>(c: Context, data: T, message = "OK.", status: 200 | 201 = 200) {
  const body: ApiSuccess<T> = { success: true, message, data, meta: meta() };
  return c.json(body, status);
}

// Code comes right after c so `grep 'failure(c, "'` finds every code (see envelop-conventions.md).
export function failure(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
  details: ErrorDetails | null = null,
) {
  assertErrorCode(code);
  const body: ApiFailure = { success: false, message, error: { code, details }, meta: meta() };
  return c.json(body, status);
}

export function notFound(c: Context, message = "Resource not found.") {
  return failure(c, "NOT_FOUND", message, 404);
}

// D1 surfaces SQLite constraint violations only through the error message text.
const CONSTRAINT_FAILURES: { pattern: string; status: ContentfulStatusCode; code: string; message: string }[] = [
  { pattern: "UNIQUE constraint failed", status: 409, code: "DUPLICATE_DATA", message: "Data already exists." },
  { pattern: "FOREIGN KEY constraint failed", status: 409, code: "RELATED_DATA_EXISTS", message: "Related data exists." },
  { pattern: "CHECK constraint failed", status: 400, code: "INVALID_DATA", message: "Data violates a constraint." },
];

// Wired as app.onError. The real error is logged, never returned to the client.
export function handleError(err: Error, c: Context) {
  if (err instanceof ValidationError) {
    return failure(c, err.code, err.message, 400, validationDetails(err.code));
  }
  const text = `${err.message} ${err.cause instanceof Error ? err.cause.message : ""}`;
  const constraint = CONSTRAINT_FAILURES.find((entry) => text.includes(entry.pattern));
  if (constraint) {
    return failure(c, constraint.code, constraint.message, constraint.status);
  }
  console.error(err);
  return failure(c, "INTERNAL_ERROR", "Internal server error.", 500);
}
