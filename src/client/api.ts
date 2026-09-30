import type { ApiResponse, BankTransfer, ErrorDetails, Payment, User } from "../shared/types";

// Typed wrapper for every endpoint. Returns a result instead of throwing, so hooks branch on
// `ok` and never need try/catch. Components never import this file — only use*.ts hooks do.

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; code: string; details: ErrorDetails | null };

// Client-side only: the request never got an envelope back (offline, DNS, aborted).
export const NETWORK_ERROR = "NETWORK_ERROR";

// The session gate listens here, so a token that expires mid-use sends the user back to login
// from whichever request noticed it first.
const unauthorizedListeners = new Set<() => void>();

export function onUnauthorized(listener: () => void): () => void {
  unauthorizedListeners.add(listener);
  return () => unauthorizedListeners.delete(listener);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    return { ok: false, status: 0, code: NETWORK_ERROR, details: null };
  }

  let envelope: ApiResponse<T>;
  try {
    envelope = (await response.json()) as ApiResponse<T>;
  } catch {
    // No JSON body: a proxy error page or an empty 5xx.
    return { ok: false, status: response.status, code: "INTERNAL_ERROR", details: null };
  }

  if (envelope.success) return { ok: true, data: envelope.data };

  const { code, details } = envelope.error;
  if (code === "UNAUTHORIZED") unauthorizedListeners.forEach((listener) => listener());
  return { ok: false, status: response.status, code, details };
}

export const api = {
  auth: {
    me: () => request<{ user: User }>("GET", "/auth/me"),
    login: (username: string, password: string) =>
      request<{ user: User }>("POST", "/auth/login", { username, password }),
    logout: () => request<null>("POST", "/auth/logout"),
    changePassword: (current_password: string, new_password: string) =>
      request<null>("POST", "/auth/change-password", { current_password, new_password }),
  },
  me: {
    payments: () => request<{ payments: Payment[] }>("GET", "/me/payments"),
    payment: (code: string) =>
      request<{ payment: Payment; bank_transfer: BankTransfer | null }>("GET", `/me/payments/${encodeURIComponent(code)}`),
    markPaymentSent: (code: string) =>
      request<{ payment: Payment }>("POST", `/me/payments/${encodeURIComponent(code)}/mark-sent`),
  },
};
