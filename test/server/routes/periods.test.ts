import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiFailure, ApiSuccess, Period, Plan } from "../../../src/shared/types";
import { currentPeriodInVietnam } from "../../../src/server/domain/period";
import { hashPassword } from "../../../src/server/domain/password";
import { app as worker } from "../../../src/server/index";
import { createDuePeriods } from "../../../src/server/scheduled";

const ADMIN = { code: "AC0000000A", username: "admin", password: "admin-password" };
const USERS = ["AC000000A1", "AC000000B0", "AC000000C0", "AC000000D0"];

let adminCookie = "";
let plan: Plan;

beforeEach(async () => {
  const insert = env.DB.prepare("INSERT INTO users (code, username, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)");
  const hash = await hashPassword("x-password");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM payments"),
    env.DB.prepare("DELETE FROM billing_periods"),
    env.DB.prepare("DELETE FROM plan_members"),
    env.DB.prepare("DELETE FROM plans"),
    env.DB.prepare("DELETE FROM users"),
    insert.bind(ADMIN.code, ADMIN.username, "Admin", await hashPassword(ADMIN.password), "ADMIN"),
    ...USERS.map((code, i) => insert.bind(code, `user${i}`, `User ${i}`, hash, "MEMBER")),
  ]);
  adminCookie = await login();
  plan = await createPlan("YouTube Family", "MONTHLY");
});

function call(method: string, path: string, body?: unknown) {
  const headers: Record<string, string> = { Cookie: adminCookie };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return worker.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }, env);
}

async function login(): Promise<string> {
  const res = await worker.request(
    "/api/auth/login",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: ADMIN.username, password: ADMIN.password }) },
    env,
  );
  return res.headers.get("Set-Cookie")!.split(";")[0];
}

async function createPlan(name: string, cycle: string): Promise<Plan> {
  const res = await call("POST", "/api/plans", { name, price: 185_500, member_amount: 37_000, cycle, max_slots: 5, payer_code: ADMIN.code });
  return ((await res.json()) as ApiSuccess<{ plan: Plan }>).data.plan;
}

// Seats are inserted directly so join/leave dates can be anywhere in time.
async function seat(planCode: string, userCode: string, joinedOn: string, leftOn: string | null = null) {
  await env.DB.prepare(
    `INSERT INTO plan_members (code, plan_id, user_id, joined_on, left_on)
     SELECT 'MB' || substr(hex(randomblob(4)), 1, 8), p.id, u.id, ?, ? FROM plans p, users u WHERE p.code = ? AND u.code = ?`,
  )
    .bind(joinedOn, leftOn, planCode, userCode)
    .run();
}

async function billedUsers(periodCode: string): Promise<string[]> {
  const { results } = await env.DB.prepare(
    `SELECT u.code FROM payments pm JOIN users u ON u.id = pm.user_id JOIN billing_periods bp ON bp.id = pm.billing_period_id
     WHERE bp.code = ? ORDER BY u.code`,
  )
    .bind(periodCode)
    .all<{ code: string }>();
  return results.map((r) => r.code);
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiFailure).error.code;
}

describe("create a period", () => {
  it("bills every seat present on the 1st, at the plan's member_amount", async () => {
    await seat(plan.code, USERS[0], "2026-01-01"); // long-standing
    await seat(plan.code, USERS[1], "2026-08-01"); // joined on the 1st -> billed
    await seat(plan.code, USERS[2], "2026-08-15"); // joined mid-month -> from next period
    await seat(plan.code, USERS[3], "2026-01-01", "2026-08-15"); // left mid-month -> still billed

    const res = await call("POST", `/api/plans/${plan.code}/periods`, { period: "2026-08" });
    expect(res.status).toBe(201);
    const { period, created } = ((await res.json()) as ApiSuccess<{ period: Period; created: boolean }>).data;
    expect(created).toBe(true);
    expect(period).toMatchObject({ period: "2026-08", price: 185_500, payment_count: 3, paid_count: 0, amount_total: 111_000, amount_paid: 0 });
    expect(period.code).toMatch(/^BP[0-9A-F]{8}$/);
    expect(await billedUsers(period.code)).toEqual([USERS[0], USERS[1], USERS[3]].sort());

    const { results } = await env.DB.prepare("SELECT code, amount, status FROM payments").all<{ code: string; amount: number; status: string }>();
    for (const payment of results) {
      expect(payment.code).toMatch(/^PM[0-9A-F]{8}$/);
      expect(payment).toMatchObject({ amount: 37_000, status: "UNPAID" });
    }
  });

  it("leaves out someone who left before the 1st, and never bills the payer", async () => {
    await seat(plan.code, USERS[0], "2026-01-01", "2026-07-31");
    const res = await call("POST", `/api/plans/${plan.code}/periods`, { period: "2026-08" });
    expect(((await res.json()) as ApiSuccess<{ period: Period }>).data.period.payment_count).toBe(0);
  });

  it("is idempotent and never recomputes an existing period", async () => {
    await seat(plan.code, USERS[0], "2026-01-01");
    const first = ((await (await call("POST", `/api/plans/${plan.code}/periods`, { period: "2026-08" })).json()) as ApiSuccess<{ period: Period }>).data.period;

    // Today's plan and seats change...
    await call("PATCH", `/api/plans/${plan.code}`, { price: 200_000, member_amount: 40_000 });
    await seat(plan.code, USERS[1], "2026-06-01");

    // ...and creating the same period again changes nothing.
    const again = await call("POST", `/api/plans/${plan.code}/periods`, { period: "2026-08" });
    expect(again.status).toBe(200);
    const { period, created } = ((await again.json()) as ApiSuccess<{ period: Period; created: boolean }>).data;
    expect(created).toBe(false);
    expect(period).toMatchObject({ code: first.code, price: 185_500, payment_count: 1, amount_total: 37_000 });

    // Any period created from now on uses today's values.
    const next = ((await (await call("POST", `/api/plans/${plan.code}/periods`, { period: "2026-07" })).json()) as ApiSuccess<{ period: Period }>).data.period;
    expect(next).toMatchObject({ price: 200_000, payment_count: 2, amount_total: 80_000 });
  });

  it("defaults to the current month in Vietnam", async () => {
    const res = await call("POST", `/api/plans/${plan.code}/periods`, {});
    expect(((await res.json()) as ApiSuccess<{ period: Period }>).data.period.period).toBe(currentPeriodInVietnam());
  });

  it("validates the period and the plan", async () => {
    expect(await errorCode(await call("POST", `/api/plans/${plan.code}/periods`, { period: "2026-13" }))).toBe("INVALID_PERIOD");
    expect(await errorCode(await call("POST", `/api/plans/${plan.code}/periods`, { period: "2999-01" }))).toBe("INVALID_PERIOD");
    await call("PATCH", `/api/plans/${plan.code}`, { active: false });
    expect(await errorCode(await call("POST", `/api/plans/${plan.code}/periods`, {}))).toBe("PLAN_INACTIVE");
  });

  it("lists periods newest first, and a plan with periods cannot be deleted", async () => {
    await seat(plan.code, USERS[0], "2026-01-01");
    await call("POST", `/api/plans/${plan.code}/periods`, { period: "2026-08" });
    await call("POST", `/api/plans/${plan.code}/periods`, { period: "2026-09" });
    await env.DB.prepare("UPDATE payments SET status = 'PAID', confirmed_at = '2026-09-02T00:00:00Z', confirmed_by = (SELECT id FROM users WHERE code = ?) WHERE id = (SELECT MIN(id) FROM payments)")
      .bind(ADMIN.code)
      .run();
    const res = await call("GET", `/api/plans/${plan.code}/periods`);
    const periods = ((await res.json()) as ApiSuccess<{ periods: Period[] }>).data.periods;
    expect(periods.map((p) => p.period)).toEqual(["2026-09", "2026-08"]);
    expect(periods[1]).toMatchObject({ paid_count: 1, amount_paid: 37_000 });
    expect(await errorCode(await call("DELETE", `/api/plans/${plan.code}`))).toBe("RELATED_DATA_EXISTS");
  });
});

describe("scheduled", () => {
  it("creates this month's period for active MONTHLY plans only, and is safe to re-run", async () => {
    const yearly = await createPlan("Yearly", "YEARLY");
    const inactive = await createPlan("Inactive", "MONTHLY");
    await call("PATCH", `/api/plans/${inactive.code}`, { active: false });
    await seat(plan.code, USERS[0], "2026-01-01");

    // 2026-10-31T17:05Z is 00:05 on 1 November in Hanoi.
    const now = new Date("2026-10-31T17:05:00Z");
    expect(await createDuePeriods(env.DB, now)).toEqual({ created: 1, failed: 0 });
    expect(await createDuePeriods(env.DB, now)).toEqual({ created: 0, failed: 0 });

    const { results } = await env.DB.prepare(
      "SELECT p.code, bp.period FROM billing_periods bp JOIN plans p ON p.id = bp.plan_id",
    ).all<{ code: string; period: string }>();
    expect(results).toEqual([{ code: plan.code, period: "2026-11" }]);
    expect(results.some((r) => r.code === yearly.code || r.code === inactive.code)).toBe(false);
  });
});
