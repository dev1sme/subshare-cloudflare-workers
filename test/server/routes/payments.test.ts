import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiFailure, ApiSuccess, BankTransfer, MyPlan, Payment, Plan, Prepayment } from "../../../src/shared/types";
import { createPeriod } from "../../../src/server/db/periods";
import { addMonths, currentPeriodInVietnam } from "../../../src/server/domain/period";
import { hashPassword } from "../../../src/server/domain/password";
import { crc16 } from "../../../src/server/domain/vietqr";
import { app as worker } from "../../../src/server/index";

const ADMIN = { code: "AC0000000A", username: "admin", password: "admin-password" };
const ALICE = { code: "AC000000A1", username: "alice", password: "alice-password" };
const BOB = { code: "AC000000B0", username: "bob", password: "bob-password" };

const current = currentPeriodInVietnam();
let admin = "";
let alice = "";
let bob = "";
let plan: Plan;
let planId = 0;

beforeEach(async () => {
  const insert = env.DB.prepare("INSERT INTO users (code, username, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM payments"),
    env.DB.prepare("DELETE FROM prepayments"),
    env.DB.prepare("DELETE FROM billing_periods"),
    env.DB.prepare("DELETE FROM plan_members"),
    env.DB.prepare("DELETE FROM plans"),
    env.DB.prepare("DELETE FROM users"),
    insert.bind(ADMIN.code, ADMIN.username, "Admin", await hashPassword(ADMIN.password), "ADMIN"),
    insert.bind(ALICE.code, ALICE.username, "Alice", await hashPassword(ALICE.password), "MEMBER"),
    insert.bind(BOB.code, BOB.username, "Bob", await hashPassword(BOB.password), "MEMBER"),
  ]);
  admin = await login(ADMIN);
  alice = await login(ALICE);
  bob = await login(BOB);
  plan = await data<{ plan: Plan }>(
    await call("POST", "/api/plans", admin, {
      name: "YouTube Family",
      price: 185_500,
      member_amount: 37_000,
      cycle: "MONTHLY",
      max_slots: 5,
      payer_code: ADMIN.code,
      bank_bin: "970436",
      bank_account_no: "0123456789",
      bank_account_name: "TEST ACCOUNT",
    }),
  ).then((d) => d.plan);
  planId = (await env.DB.prepare("SELECT id FROM plans WHERE code = ?").bind(plan.code).first<{ id: number }>())!.id;
  for (const user of [ALICE, BOB]) {
    await call("POST", `/api/plans/${plan.code}/members`, admin, { user_code: user.code, joined_on: "2026-01-01" });
  }
});

function call(method: string, path: string, cookie: string, body?: unknown) {
  const headers: Record<string, string> = { Cookie: cookie };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return worker.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }, env);
}

async function login(user: { username: string; password: string }): Promise<string> {
  const res = await worker.request(
    "/api/auth/login",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: user.username, password: user.password }) },
    env,
  );
  return res.headers.get("Set-Cookie")!.split(";")[0];
}

async function data<T>(res: Response): Promise<T> {
  const body = (await res.json()) as ApiSuccess<T> | ApiFailure;
  if (!body.success) throw new Error(`${res.status} ${body.error.code}`);
  return body.data;
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiFailure).error.code;
}

async function myPayments(cookie: string): Promise<Payment[]> {
  return (await data<{ payments: Payment[] }>(await call("GET", "/api/me/payments", cookie))).payments;
}

describe("member: own payments", () => {
  beforeEach(async () => {
    await call("POST", `/api/plans/${plan.code}/periods`, admin, {});
  });

  it("lists only my payments and shows how to pay with a valid VietQR", async () => {
    const [mine] = await myPayments(alice);
    expect(mine).toMatchObject({ plan: { code: plan.code }, user: { code: ALICE.code }, period: current, amount: 37_000, status: "UNPAID" });
    expect(await myPayments(alice)).toHaveLength(1);

    const detail = await data<{ payment: Payment; bank_transfer: BankTransfer }>(await call("GET", `/api/me/payments/${mine.code}`, alice));
    expect(detail.bank_transfer).toMatchObject({ bank_bin: "970436", account_no: "0123456789", amount: 37_000, note: mine.code });
    const qr = detail.bank_transfer.qr;
    expect(qr).toContain(`5405370005802VN`);
    expect(qr).toContain(`0810${mine.code}`);
    expect(qr.slice(-4)).toBe(crc16(qr.slice(0, -4)));
  });

  it("hides another member's payment behind 404, and admins cannot use /me", async () => {
    const [mine] = await myPayments(alice);
    expect((await call("GET", `/api/me/payments/${mine.code}`, bob)).status).toBe(404);
    expect((await call("POST", `/api/me/payments/${mine.code}/mark-sent`, bob)).status).toBe(404);
    expect(await errorCode(await call("GET", "/api/me/payments", admin))).toBe("FORBIDDEN");
  });

  it("marks as sent once; only an admin confirms", async () => {
    const [mine] = await myPayments(alice);
    const sent = await data<{ payment: Payment }>(await call("POST", `/api/me/payments/${mine.code}/mark-sent`, alice));
    expect(sent.payment.status).toBe("PENDING");
    expect(sent.payment.marked_at).not.toBeNull();
    expect(await errorCode(await call("POST", `/api/me/payments/${mine.code}/mark-sent`, alice))).toBe("INVALID_STATUS_TRANSITION");
    expect(await errorCode(await call("PATCH", `/api/payments/${mine.code}`, alice, { status: "PAID" }))).toBe("FORBIDDEN");
  });

  it("drops the QR once paid or when the plan has no bank details", async () => {
    const [mine] = await myPayments(alice);
    await call("PATCH", `/api/payments/${mine.code}`, admin, { status: "PAID" });
    expect((await data<{ bank_transfer: BankTransfer | null }>(await call("GET", `/api/me/payments/${mine.code}`, alice))).bank_transfer).toBeNull();

    const [bobs] = await myPayments(bob);
    await call("PATCH", `/api/plans/${plan.code}`, admin, { bank_bin: null, bank_account_no: null });
    expect((await data<{ bank_transfer: BankTransfer | null }>(await call("GET", `/api/me/payments/${bobs.code}`, bob))).bank_transfer).toBeNull();
  });
});

describe("admin: confirm and revert", () => {
  beforeEach(async () => {
    await call("POST", `/api/plans/${plan.code}/periods`, admin, {});
  });

  it("lists the waiting payments and moves them through PAID and back", async () => {
    const [mine] = await myPayments(alice);
    await call("POST", `/api/me/payments/${mine.code}/mark-sent`, alice);

    const pending = await data<{ payments: Payment[] }>(await call("GET", "/api/payments?status=PENDING", admin));
    expect(pending.payments.map((p) => p.code)).toEqual([mine.code]);
    const all = await data<{ payments: Payment[] }>(await call("GET", `/api/payments?period=${current}&plan_code=${plan.code}`, admin));
    expect(all.payments).toHaveLength(2);

    const paid = await data<{ payment: Payment }>(await call("PATCH", `/api/payments/${mine.code}`, admin, { status: "PAID" }));
    expect(paid.payment).toMatchObject({ status: "PAID" });
    expect(paid.payment.confirmed_at).not.toBeNull();
    expect(await errorCode(await call("PATCH", `/api/payments/${mine.code}`, admin, { status: "PAID" }))).toBe("INVALID_STATUS_TRANSITION");

    const back = await data<{ payment: Payment }>(await call("PATCH", `/api/payments/${mine.code}`, admin, { status: "UNPAID" }));
    expect(back.payment).toMatchObject({ status: "UNPAID", marked_at: null, confirmed_at: null });
    expect(await errorCode(await call("PATCH", `/api/payments/${mine.code}`, admin, { status: "UNPAID" }))).toBe("INVALID_STATUS_TRANSITION");
  });

  it("validates filters and the new status", async () => {
    expect(await errorCode(await call("GET", "/api/payments?status=DONE", admin))).toBe("INVALID_STATUS");
    expect(await errorCode(await call("GET", "/api/payments?period=2026-13", admin))).toBe("INVALID_PERIOD");
    expect(await errorCode(await call("GET", "/api/payments?plan_code=AC0000000A", admin))).toBe("INVALID_PLAN_CODE");
    const [mine] = await myPayments(alice);
    expect(await errorCode(await call("PATCH", `/api/payments/${mine.code}`, admin, { status: "PENDING" }))).toBe("INVALID_STATUS");
  });
});

describe("prepayments", () => {
  async function prepay(cookie: string, months: number): Promise<Response> {
    return call("POST", "/api/me/prepayments", cookie, { plan_code: plan.code, months });
  }

  it("lists my plans with the monthly amount", async () => {
    const { plans } = await data<{ plans: MyPlan[] }>(await call("GET", "/api/me/plans", alice));
    expect(plans).toEqual([{ code: plan.code, name: "YouTube Family", provider: "OTHER", member_amount: 37_000 }]);
  });

  it("starts at the current month, charges months x amount with no discount, and shows the QR", async () => {
    const res = await prepay(alice, 6);
    expect(res.status).toBe(201);
    const { prepayment, bank_transfer } = await data<{ prepayment: Prepayment; bank_transfer: BankTransfer }>(res);
    expect(prepayment).toMatchObject({ start_period: current, end_period: addMonths(current, 5), months: 6, amount_per_month: 37_000, amount: 222_000, status: "UNPAID" });
    expect(prepayment.code).toMatch(/^PP[0-9A-F]{8}$/);
    expect(bank_transfer).toMatchObject({ amount: 222_000, note: prepayment.code });
  });

  it("skips months already paid or reported, and refuses to overlap", async () => {
    await call("POST", `/api/plans/${plan.code}/periods`, admin, {});
    const [mine] = await myPayments(alice);
    await call("POST", `/api/me/payments/${mine.code}/mark-sent`, alice);

    const first = await data<{ prepayment: Prepayment }>(await prepay(alice, 3));
    expect(first.prepayment.start_period).toBe(addMonths(current, 1));
    const second = await data<{ prepayment: Prepayment }>(await prepay(alice, 3));
    expect(second.prepayment.start_period).toBe(addMonths(current, 4));

    // A later prepayment in the way makes a longer one overlap.
    await call("DELETE", `/api/me/prepayments/${first.prepayment.code}`, alice);
    const res = await prepay(alice, 6);
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("PREPAYMENT_OVERLAP");
  });

  it("validates the request and hides plans without my seat", async () => {
    expect(await errorCode(await prepay(alice, 5))).toBe("INVALID_MONTHS");
    expect(await errorCode(await call("POST", "/api/me/prepayments", alice, { months: 3 }))).toBe("MISSING_PLAN_CODE");
    expect(await errorCode(await call("POST", "/api/me/prepayments", alice, { plan_code: "PLFFFFFFFF", months: 3 }))).toBe("NOT_FOUND");
    expect(await errorCode(await call("POST", "/api/me/prepayments", alice, { plan_code: ALICE.code, months: 3 }))).toBe("INVALID_PLAN_CODE");
  });

  it("confirming settles existing months and pre-pays future periods; reverting undoes both", async () => {
    await call("POST", `/api/plans/${plan.code}/periods`, admin, {});
    const { prepayment } = await data<{ prepayment: Prepayment }>(await prepay(alice, 3));
    await call("POST", `/api/me/prepayments/${prepayment.code}/mark-sent`, alice);

    const confirmed = await data<{ prepayment: Prepayment }>(await call("PATCH", `/api/prepayments/${prepayment.code}`, admin, { status: "PAID" }));
    expect(confirmed.prepayment.status).toBe("PAID");

    // The current month, created before the confirmation, is now PAID through the prepayment.
    let mine = await myPayments(alice);
    expect(mine).toHaveLength(1);
    expect(mine[0]).toMatchObject({ period: current, status: "PAID", prepayment_code: prepayment.code, amount: 37_000 });
    // Bob is not touched.
    expect((await myPayments(bob))[0].status).toBe("UNPAID");

    // Next month's period is created PAID for Alice, UNPAID for Bob — even after the price changed.
    await call("PATCH", `/api/plans/${plan.code}`, admin, { member_amount: 40_000 });
    await createPeriod(env.DB, planId, addMonths(current, 1));
    mine = await myPayments(alice);
    const next = mine.find((p) => p.period === addMonths(current, 1))!;
    expect(next).toMatchObject({ status: "PAID", prepayment_code: prepayment.code, amount: 37_000 });
    expect((await myPayments(bob)).find((p) => p.period === addMonths(current, 1))).toMatchObject({ status: "UNPAID", amount: 40_000 });
    // After the covered range, Alice is billed normally again.
    await createPeriod(env.DB, planId, addMonths(current, 3));
    expect((await myPayments(alice)).find((p) => p.period === addMonths(current, 3))).toMatchObject({ status: "UNPAID", prepayment_code: null });

    // A covered payment moves only with its prepayment.
    expect(await errorCode(await call("PATCH", `/api/payments/${next.code}`, admin, { status: "UNPAID" }))).toBe("PAYMENT_COVERED_BY_PREPAYMENT");
    expect(await errorCode(await call("DELETE", `/api/prepayments/${prepayment.code}`, admin))).toBe("CANNOT_DELETE_PREPAYMENT");

    await call("PATCH", `/api/prepayments/${prepayment.code}`, admin, { status: "UNPAID" });
    mine = await myPayments(alice);
    for (const period of [current, addMonths(current, 1)]) {
      expect(mine.find((p) => p.period === period)).toMatchObject({ status: "UNPAID", prepayment_code: null });
    }
    expect((await call("DELETE", `/api/prepayments/${prepayment.code}`, admin)).status).toBe(200);
  });

  it("lets a member delete only their own unreported prepayment", async () => {
    const { prepayment } = await data<{ prepayment: Prepayment }>(await prepay(alice, 3));
    expect((await call("DELETE", `/api/me/prepayments/${prepayment.code}`, bob)).status).toBe(404);
    await call("POST", `/api/me/prepayments/${prepayment.code}/mark-sent`, alice);
    expect(await errorCode(await call("DELETE", `/api/me/prepayments/${prepayment.code}`, alice))).toBe("CANNOT_DELETE_PREPAYMENT");
    const pending = await data<{ prepayments: Prepayment[] }>(await call("GET", "/api/prepayments?status=PENDING", admin));
    expect(pending.prepayments.map((p) => p.code)).toEqual([prepayment.code]);
  });
});
