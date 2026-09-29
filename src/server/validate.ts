import type { Context } from "hono";
import type { ErrorDetails } from "../shared/types";
import { type CodePrefix, isCode } from "./domain/code";
import { MAX_PASSWORD_LENGTH } from "./domain/password";
import { normalizeUsername } from "./domain/username";

const ERROR_CODE = /^[A-Z][A-Z0-9]*(_[A-Z0-9]+)*$/;
const FIELD_PREFIX = /^(MISSING|INVALID|TOO_LONG)_([A-Z0-9_]+)$/;

export function assertErrorCode(code: string): void {
  if (!ERROR_CODE.test(code)) {
    throw new Error(`Error code must be UPPER_SNAKE: ${code}`);
  }
}

// Thrown by validation; the app's onError turns it into a 400 envelope.
export class ValidationError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "ValidationError";
    this.code = code;
  }
}

export function fail(code: string, message = "The given data was invalid."): never {
  assertErrorCode(code);
  throw new ValidationError(code, message);
}

// MISSING_PLAN_NAME -> { plan_name: ["MISSING_PLAN_NAME"] }. Codes that name no field -> null.
export function validationDetails(code: string): ErrorDetails | null {
  const match = FIELD_PREFIX.exec(code);
  if (!match) return null;
  return { [match[2].toLowerCase()]: [code] };
}

export type Body = Record<string, unknown>;

export async function readBody(c: Context): Promise<Body> {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    fail("MALFORMED_JSON", "Request body is not valid JSON.");
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    fail("MALFORMED_JSON", "Request body must be a JSON object.");
  }
  return body as Body;
}

// `field` is snake_case and becomes part of the code: plan_name -> MISSING_PLAN_NAME.
function fieldCode(prefix: "MISSING" | "INVALID" | "TOO_LONG", field: string): string {
  return `${prefix}_${field.toUpperCase()}`;
}

export function requireString(body: Body, field: string, maxLength: number): string {
  const value = body[field];
  if (value === undefined || value === null) fail(fieldCode("MISSING", field));
  if (typeof value !== "string") fail(fieldCode("INVALID", field));
  const trimmed = value.trim();
  if (trimmed === "") fail(fieldCode("MISSING", field));
  if (trimmed.length > maxLength) fail(fieldCode("TOO_LONG", field));
  return trimmed;
}

export function optionalString(body: Body, field: string, maxLength: number): string | null {
  const value = body[field];
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") fail(fieldCode("INVALID", field));
  const trimmed = value.trim();
  if (trimmed === "") return null;
  if (trimmed.length > maxLength) fail(fieldCode("TOO_LONG", field));
  return trimmed;
}

export function requireInteger(body: Body, field: string, min: number, max: number): number {
  const value = body[field];
  if (value === undefined || value === null) fail(fieldCode("MISSING", field));
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max) {
    fail(fieldCode("INVALID", field));
  }
  return value;
}

export function requireEnum<T extends string>(body: Body, field: string, allowed: readonly T[]): T {
  const value = body[field];
  if (value === undefined || value === null) fail(fieldCode("MISSING", field));
  if (typeof value !== "string" || !allowed.includes(value as T)) fail(fieldCode("INVALID", field));
  return value as T;
}

// Passwords are never trimmed — surrounding spaces are part of the password.
export function requirePassword(body: Body, field: string): string {
  const value = body[field];
  if (value === undefined || value === null || value === "") fail(fieldCode("MISSING", field));
  if (typeof value !== "string") fail(fieldCode("INVALID", field));
  if (value.length > MAX_PASSWORD_LENGTH) fail(fieldCode("TOO_LONG", field));
  return value;
}

// Checked before any lookup: a numeric id or another table's code never reaches the database.
export function parseCode(prefix: CodePrefix, raw: string): string {
  if (!isCode(prefix, raw)) fail("INVALID_CODE", "Malformed resource code.");
  return raw;
}

export function requireUsername(body: Body, field = "username"): string {
  const value = body[field];
  if (value === undefined || value === null || value === "") fail(fieldCode("MISSING", field));
  if (typeof value !== "string") fail(fieldCode("INVALID", field));
  return normalizeUsername(value) ?? fail(fieldCode("INVALID", field));
}
