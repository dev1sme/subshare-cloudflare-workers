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

// A user as the admin account screen sees it.
export type Account = User & { created_at: string };

export type Cycle = "MONTHLY" | "YEARLY";

export type Plan = {
  code: string;
  name: string;
  // VND per cycle the payer pays the provider, fees included, set by the admin.
  price: number;
  // VND per cycle every member pays, set by the admin. Independent of price.
  member_amount: number;
  cycle: Cycle;
  // Seats for members; the payer is not counted.
  max_slots: number;
  active_members: number;
  payer: { code: string; display_name: string };
  // Where members transfer to. Null when not set — the member screen then shows no QR.
  bank_bin: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  active: boolean;
  created_at: string;
};

// A seat in a plan. `left_on` is null while the member is active; leaving keeps the row as history.
export type Member = {
  code: string;
  user: { code: string; username: string; display_name: string };
  joined_on: string;
  left_on: string | null;
};
