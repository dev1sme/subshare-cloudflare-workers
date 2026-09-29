// API types shared between client and server. The client imports from here, never from src/server/.

// Response envelope — spec: .claude/rules/envelop-conventions.md.

export type ResponseMeta = { timestamp: number };

// Field name (lowercased from the code) -> the error codes raised for it.
export type ErrorDetails = Record<string, string[]>;

export type ApiSuccess<T> = {
  success: true;
  message: string;
  data: T;
  meta: ResponseMeta;
};

export type ApiFailure = {
  success: false;
  message: string;
  error: { code: string; details: ErrorDetails | null };
  meta: ResponseMeta;
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type Role = "ADMIN" | "MEMBER";

// A user as the API returns it — never the id or the password hash.
export type User = {
  code: string;
  username: string;
  display_name: string;
  role: Role;
};
