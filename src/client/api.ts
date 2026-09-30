import type {
  Account,
  ApiResponse,
  BankTransfer,
  Cycle,
  ErrorDetails,
  JoinRequest,
  Member,
  MyPlan,
  MyWish,
  OpenPlan,
  Payment,
  PaymentStatus,
  Period,
  Plan,
  Prepayment,
  Role,
  User,
  Wish,
} from "../shared/types";
import type { Provider } from "../shared/providers";

// What POST / PATCH /api/plans take (docs/api.md). Bank fields null = not set / clear.
export type PlanInput = {
  name: string;
  provider: Provider;
  price: number;
  member_amount: number;
  cycle: Cycle;
  max_slots: number;
  payer_code: string;
  bank_bin: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  active: boolean;
  accepting_requests: boolean;
};

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
    plans: () => request<{ plans: MyPlan[] }>("GET", "/me/plans"),
    payments: () => request<{ payments: Payment[] }>("GET", "/me/payments"),
    payment: (code: string) =>
      request<{ payment: Payment; bank_transfer: BankTransfer | null }>("GET", `/me/payments/${encodeURIComponent(code)}`),
    markPaymentSent: (code: string) =>
      request<{ payment: Payment }>("POST", `/me/payments/${encodeURIComponent(code)}/mark-sent`),
    openPlans: () => request<{ plans: OpenPlan[] }>("GET", "/me/open-plans"),
    joinRequests: () => request<{ join_requests: JoinRequest[] }>("GET", "/me/join-requests"),
    askToJoin: (plan_code: string, note: string) =>
      request<{ join_request: JoinRequest }>("POST", "/me/join-requests", { plan_code, note }),
    cancelJoinRequest: (code: string) =>
      request<{ join_request: JoinRequest }>("POST", `/me/join-requests/${encodeURIComponent(code)}/cancel`),
    wishes: () => request<{ wishes: MyWish[] }>("GET", "/me/wishes"),
    wish: (fields: { provider: Provider; service_name: string | null; note: string }) =>
      request<{ wish: MyWish }>("POST", "/me/wishes", fields),
    cancelWish: (code: string) => request<{ wish: MyWish }>("POST", `/me/wishes/${encodeURIComponent(code)}/cancel`),
    dismissWish: (code: string) => request<{ wish: MyWish }>("POST", `/me/wishes/${encodeURIComponent(code)}/seen`),
  },
  admin: {
    plans: () => request<{ plans: Plan[] }>("GET", "/plans"),
    setAcceptingRequests: (code: string, accepting_requests: boolean) =>
      request<{ plan: Plan }>("PATCH", `/plans/${encodeURIComponent(code)}`, { accepting_requests }),
    pendingJoinRequests: () => request<{ join_requests: JoinRequest[] }>("GET", "/join-requests?status=PENDING"),
    approveJoinRequest: (code: string) =>
      request<{ join_request: JoinRequest }>("POST", `/join-requests/${encodeURIComponent(code)}/approve`, {}),
    rejectJoinRequest: (code: string) =>
      request<{ join_request: JoinRequest }>("POST", `/join-requests/${encodeURIComponent(code)}/reject`),
    plan: (code: string) => request<{ plan: Plan }>("GET", `/plans/${encodeURIComponent(code)}`),
    // wish_codes: open a plan for these wishes (fulfils them, 48-hour head start for those members).
    createPlan: (fields: PlanInput, wish_codes: string[] = []) =>
      request<{ plan: Plan; wishes_fulfilled: number }>("POST", "/plans", wish_codes.length > 0 ? { ...fields, wish_codes } : fields),
    wishes: () => request<{ wishes: Wish[] }>("GET", "/wishes"),
    declineWish: (code: string) => request<{ wish: Wish }>("POST", `/wishes/${encodeURIComponent(code)}/decline`),
    updatePlan: (code: string, patch: Partial<PlanInput>) =>
      request<{ plan: Plan }>("PATCH", `/plans/${encodeURIComponent(code)}`, patch),
    deletePlan: (code: string) => request<null>("DELETE", `/plans/${encodeURIComponent(code)}`),
    planMembers: (code: string) => request<{ members: Member[] }>("GET", `/plans/${encodeURIComponent(code)}/members`),
    addMember: (planCode: string, user_code: string, joined_on: string) =>
      request<{ member: Member }>("POST", `/plans/${encodeURIComponent(planCode)}/members`, { user_code, joined_on }),
    leaveMember: (memberCode: string, left_on: string) =>
      request<{ member: Member }>("PATCH", `/members/${encodeURIComponent(memberCode)}`, { left_on }),
    planPeriods: (code: string) => request<{ periods: Period[] }>("GET", `/plans/${encodeURIComponent(code)}/periods`),
    // No period: the current month in Vietnam. `created: false` when it already existed.
    createPeriod: (code: string) =>
      request<{ period: Period; created: boolean }>("POST", `/plans/${encodeURIComponent(code)}/periods`, {}),
    accounts: () => request<{ accounts: Account[] }>("GET", "/accounts"),
    createAccount: (fields: { username: string; display_name: string; role: Role }) =>
      request<{ account: Account; password: string }>("POST", "/accounts", fields),
    updateAccount: (code: string, patch: { display_name?: string; role?: Role }) =>
      request<{ account: Account }>("PATCH", `/accounts/${encodeURIComponent(code)}`, patch),
    resetPassword: (code: string) =>
      request<{ password: string }>("POST", `/accounts/${encodeURIComponent(code)}/reset-password`, {}),
    deleteAccount: (code: string) => request<null>("DELETE", `/accounts/${encodeURIComponent(code)}`),
    // Always filtered by status (and period): an unfiltered list reads the whole payments table.
    payments: (status: PaymentStatus, period?: string) =>
      request<{ payments: Payment[] }>(
        "GET",
        `/payments?${new URLSearchParams(period ? { status, period } : { status }).toString()}`,
      ),
    setPaymentStatus: (code: string, status: "PAID" | "UNPAID") =>
      request<{ payment: Payment }>("PATCH", `/payments/${encodeURIComponent(code)}`, { status }),
    prepayments: (status: PaymentStatus) => request<{ prepayments: Prepayment[] }>("GET", `/prepayments?status=${status}`),
    setPrepaymentStatus: (code: string, status: "PAID" | "UNPAID") =>
      request<{ prepayment: Prepayment }>("PATCH", `/prepayments/${encodeURIComponent(code)}`, { status }),
  },
};
