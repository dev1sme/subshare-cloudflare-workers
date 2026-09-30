import type { Provider } from "./providers";

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
  provider: Provider;
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
  // Listed to members in "Khám phá gói", who may ask for a seat.
  accepting_requests: boolean;
  // End of the head start given to members whose wishes opened this plan; null = none.
  priority_until: string | null;
  created_at: string;
};

// A seat in a plan. `left_on` is null while the member is active; leaving keeps the row as history.
export type Member = {
  code: string;
  user: { code: string; username: string; display_name: string };
  joined_on: string;
  left_on: string | null;
};

// One billing period of a plan, with its payments summarised.
export type Period = {
  code: string;
  period: string;
  // plans.price when the period was created.
  price: number;
  payment_count: number;
  paid_count: number;
  // Sum of payments.amount (each a snapshot of plans.member_amount).
  amount_total: number;
  amount_paid: number;
  created_at: string;
};

export type PaymentStatus = "UNPAID" | "PENDING" | "PAID";

// Everything a member needs to transfer: copy rows and the VietQR payload the browser draws.
// Null when the plan has no bank details or nothing is owed.
export type BankTransfer = {
  bank_bin: string;
  account_no: string;
  account_name: string | null;
  // Whole VND — copy this, not a formatted string.
  amount: number;
  // The payment / prepayment code, used as the transfer note.
  note: string;
  qr: string;
};

type PlanRef = { code: string; name: string; provider: Provider };
type UserRef = { code: string; username: string; display_name: string };

// One member's share of one monthly period.
export type Payment = {
  code: string;
  plan: PlanRef;
  user: UserRef;
  period: string;
  amount: number;
  status: PaymentStatus;
  marked_at: string | null;
  confirmed_at: string | null;
  // Set when the payment was settled by a prepayment.
  prepayment_code: string | null;
};

// 3, 6 or 12 months paid at once, no discount.
export type Prepayment = {
  code: string;
  plan: PlanRef;
  user: UserRef;
  start_period: string;
  end_period: string;
  months: number;
  amount_per_month: number;
  amount: number;
  status: PaymentStatus;
  created_at: string;
  marked_at: string | null;
  confirmed_at: string | null;
};

// A plan the signed-in member holds a seat in.
export type MyPlan = PlanRef & { member_amount: number };

export type JoinRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

// A member asking for a seat in a plan the admin opened. Approving creates the seat.
export type JoinRequest = {
  code: string;
  plan: PlanRef & { member_amount: number; max_slots: number; active_members: number };
  user: UserRef;
  status: JoinRequestStatus;
  note: string | null;
  created_at: string;
  decided_at: string | null;
};

// A plan a member may ask to join: active, accepting requests, and not already theirs.
export type OpenPlan = PlanRef & {
  member_amount: number;
  cycle: Cycle;
  max_slots: number;
  active_members: number;
  // The member's own open request for this plan, if any.
  pending_request_code: string | null;
  // Other members' requests waiting for an admin: free seats may already be spoken for.
  pending_requests: number;
  // Until then only members whose wish opened the plan may ask; null = open to all.
  priority_until: string | null;
  // This member is one of them.
  priority_for_me: boolean;
};

export type WishStatus = "OPEN" | "FULFILLED" | "CANCELLED" | "DECLINED";

// A member's ask for a plan of some service to be opened (docs/data-model.md#yêu-cầu-mở-gói).
type WishBase = {
  code: string;
  provider: Provider;
  // Only for provider OTHER: the service as the member typed it.
  service_name: string | null;
  note: string | null;
  status: WishStatus;
  created_at: string;
  decided_at: string | null;
};

// The member's own view: how many others want the same service (never who), and the plan that
// was opened for it with what they need to decide to ask to join.
export type MyWish = WishBase & {
  others_waiting: number;
  seen: boolean;
  plan:
    | (PlanRef & {
        member_amount: number;
        open: boolean;
        free_seats: number;
        priority_until: string | null;
        // The member already has a seat in it, or a pending request for it.
        joined: boolean;
      })
    | null;
};

// The admin's view: who wants it.
export type Wish = WishBase & { user: UserRef };
