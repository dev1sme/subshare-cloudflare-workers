import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiFailure, ApiSuccess, Plan } from "../../../src/shared/types";
import { hashPassword } from "../../../src/server/domain/password";
import { app as worker } from "../../../src/server/index";

const ADMIN = { code: "AC0000000A", username: "admin", password: "admin-password" };
const OTHER_ADMIN = { code: "AC0000000C", username: "admin2", password: "admin2-password" };
const MEMBER = { code: "AC0000000B", username: "member", password: "member-password" };

let adminCookie = "";

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
    insert.bind(OTHER_ADMIN.code, OTHER_ADMIN.username, "Admin 2", hash, "ADMIN"),
    insert.bind(MEMBER.code, MEMBER.username, "Member", await hashPassword(MEMBER.password), "MEMBER"),
  ]);
  adminCookie = await login(ADMIN.username, ADMIN.password);
});

function call(method: string, path: string, body?: unknown, cookie = adminCookie) {
  const headers: Record<string, string> = { Cookie: cookie };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return worker.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }, env);
}

async function login(username: string, password: string): Promise<string> {
  const res = await worker.request(
    "/api/auth/login",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username, password }) },
    env,
  );
  return res.headers.get("Set-Cookie")!.split(";")[0];
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiFailure).error.code;
}

const YOUTUBE = {
  name: "YouTube Family",
  price: 185_500,
  member_amount: 37_000,
  cycle: "MONTHLY",
  max_slots: 5,
  payer_code: ADMIN.code,
  bank_bin: "970436",
  bank_account_no: "0123456789",
  bank_account_name: "TEST ACCOUNT",
};

async function createPlan(overrides: Record<string, unknown> = {}): Promise<Plan> {
  const res = await call("POST", "/api/plans", { ...YOUTUBE, ...overrides });
  expect(res.status).toBe(201);
  return ((await res.json()) as ApiSuccess<{ plan: Plan }>).data.plan;
}

async function addSeat(planCode: string, userCode: string) {
  await env.DB.prepare(
    "INSERT INTO plan_members (code, plan_id, user_id, joined_on) SELECT 'MB' || substr(?, 3), p.id, u.id, '2026-09-01' FROM plans p, users u WHERE p.code = ? AND u.code = ?",
  )
    .bind(userCode, planCode, userCode)
    .run();
}

describe("guard", () => {
  it("is admin-only", async () => {
    expect((await call("GET", "/api/plans", undefined, "")).status).toBe(401);
    const member = await login(MEMBER.username, MEMBER.password);
    expect(await errorCode(await call("GET", "/api/plans", undefined, member))).toBe("FORBIDDEN");
  });
});

describe("create and read", () => {
  it("stores the admin-set price and returns the payer, not their id", async () => {
    const plan = await createPlan();
    expect(plan).toMatchObject({
      name: "YouTube Family",
      price: 185_500,
      member_amount: 37_000,
      cycle: "MONTHLY",
      max_slots: 5,
      active_members: 0,
      payer: { code: ADMIN.code, display_name: "Admin" },
      bank_bin: "970436",
      active: true,
    });
    expect(plan.code).toMatch(/^PL[0-9A-F]{8}$/);
    expect(JSON.stringify(plan)).not.toMatch(/"(id|payer_id)"/);

    const one = await call("GET", `/api/plans/${plan.code}`);
    expect(((await one.json()) as ApiSuccess<{ plan: Plan }>).data.plan.code).toBe(plan.code);
    const list = await call("GET", "/api/plans");
    expect(((await list.json()) as ApiSuccess<{ plans: Plan[] }>).data.plans).toHaveLength(1);
  });

  it("stores the provider, OTHER by default, and rejects one not on the list", async () => {
    expect((await createPlan()).provider).toBe("OTHER");
    const plan = await createPlan({ provider: "YOUTUBE" });
    expect(plan.provider).toBe("YOUTUBE");

    const patched = await call("PATCH", `/api/plans/${plan.code}`, { provider: "APPLE" });
    expect(((await patched.json()) as ApiSuccess<{ plan: Plan }>).data.plan.provider).toBe("APPLE");

    for (const provider of ["youtube", "HBO", 1, null]) {
      const res = await call("POST", "/api/plans", { ...YOUTUBE, provider });
      expect(res.status).toBe(400);
      expect(((await res.json()) as ApiFailure).error.code).toBe(provider === null ? "MISSING_PROVIDER" : "INVALID_PROVIDER");
    }
  });

  it("lists plans by name ignoring case", async () => {
    await createPlan({ name: "YouTube Family" });
    await createPlan({ name: "iCloud 2TB" });
    await createPlan({ name: "Netflix" });
    const res = await call("GET", "/api/plans");
    const { plans } = ((await res.json()) as ApiSuccess<{ plans: Plan[] }>).data;
    expect(plans.map((p) => p.name)).toEqual(["iCloud 2TB", "Netflix", "YouTube Family"]);
  });

  it("allows a plan without bank details", async () => {
    const plan = await createPlan({ bank_bin: null, bank_account_no: undefined, bank_account_name: "" });
    expect(plan).toMatchObject({ bank_bin: null, bank_account_no: null, bank_account_name: null });
  });

  it("validates fields", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ name: undefined }, "MISSING_NAME"],
      [{ price: 0 }, "INVALID_PRICE"],
      [{ price: 1.5 }, "INVALID_PRICE"],
      [{ member_amount: undefined }, "MISSING_MEMBER_AMOUNT"],
      [{ member_amount: 0 }, "INVALID_MEMBER_AMOUNT"],
      [{ cycle: "WEEKLY" }, "INVALID_CYCLE"],
      [{ max_slots: 0 }, "INVALID_MAX_SLOTS"],
      [{ payer_code: undefined }, "MISSING_PAYER_CODE"],
      [{ payer_code: "PL00000001" }, "INVALID_PAYER_CODE"],
      [{ payer_code: "ACFFFFFFFF" }, "INVALID_PAYER_CODE"],
      [{ payer_code: MEMBER.code }, "PAYER_MUST_BE_ADMIN"],
      [{ bank_bin: "97043" }, "INVALID_BANK_BIN"],
      [{ bank_account_no: "12 34" }, "INVALID_BANK_ACCOUNT_NO"],
      [{ bank_bin: null }, "INCOMPLETE_BANK_DETAILS"],
      [{ active: "yes" }, "INVALID_ACTIVE"],
    ];
    for (const [overrides, code] of cases) {
      const res = await call("POST", "/api/plans", { ...YOUTUBE, ...overrides });
      expect(res.status, code).toBe(400);
      expect(await errorCode(res)).toBe(code);
    }
  });

  it("addresses plans by code only", async () => {
    expect(await errorCode(await call("GET", "/api/plans/1"))).toBe("INVALID_CODE");
    expect(await errorCode(await call("GET", `/api/plans/${ADMIN.code}`))).toBe("INVALID_CODE");
    expect((await call("GET", "/api/plans/PLFFFFFFFF")).status).toBe(404);
  });
});

describe("update", () => {
  it("changes allowlisted fields and ignores the rest", async () => {
    const plan = await createPlan();
    const res = await call("PATCH", `/api/plans/${plan.code}`, { price: 190_000, member_amount: 38_000, active: false, payer_id: 999, code: "PL00000000" });
    const updated = ((await res.json()) as ApiSuccess<{ plan: Plan }>).data.plan;
    expect(updated).toMatchObject({ code: plan.code, price: 190_000, member_amount: 38_000, active: false, payer: { code: ADMIN.code } });
    expect(await errorCode(await call("PATCH", `/api/plans/${plan.code}`, { payer_id: 1 }))).toBe("NOTHING_TO_UPDATE");
  });

  it("clears bank details only together", async () => {
    const plan = await createPlan();
    expect(await errorCode(await call("PATCH", `/api/plans/${plan.code}`, { bank_account_no: null }))).toBe("INCOMPLETE_BANK_DETAILS");
    const cleared = await call("PATCH", `/api/plans/${plan.code}`, { bank_bin: null, bank_account_no: null });
    expect(((await cleared.json()) as ApiSuccess<{ plan: Plan }>).data.plan).toMatchObject({ bank_bin: null, bank_account_no: null });
  });

  it("keeps seats at or above the active members", async () => {
    const plan = await createPlan({ max_slots: 2 });
    await addSeat(plan.code, MEMBER.code);
    await addSeat(plan.code, OTHER_ADMIN.code);
    const res = await call("PATCH", `/api/plans/${plan.code}`, { max_slots: 1 });
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("SLOTS_BELOW_MEMBERS");
    expect((await call("PATCH", `/api/plans/${plan.code}`, { max_slots: 2 })).status).toBe(200);
  });

  it("changes the payer to another admin, never to someone holding a seat", async () => {
    const plan = await createPlan();
    await addSeat(plan.code, OTHER_ADMIN.code);
    const res = await call("PATCH", `/api/plans/${plan.code}`, { payer_code: OTHER_ADMIN.code });
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("PAYER_IS_MEMBER");
    expect(await errorCode(await call("PATCH", `/api/plans/${plan.code}`, { payer_code: MEMBER.code }))).toBe("PAYER_MUST_BE_ADMIN");

    const other = await createPlan({ name: "Spotify" });
    const moved = await call("PATCH", `/api/plans/${other.code}`, { payer_code: OTHER_ADMIN.code });
    expect(((await moved.json()) as ApiSuccess<{ plan: Plan }>).data.plan.payer.code).toBe(OTHER_ADMIN.code);
  });
});

describe("delete", () => {
  it("deletes an unused plan, keeps one with seats", async () => {
    const unused = await createPlan();
    expect((await call("DELETE", `/api/plans/${unused.code}`)).status).toBe(200);
    expect((await call("GET", `/api/plans/${unused.code}`)).status).toBe(404);

    const used = await createPlan();
    await addSeat(used.code, MEMBER.code);
    const res = await call("DELETE", `/api/plans/${used.code}`);
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("RELATED_DATA_EXISTS");
  });

  it("keeps the payer account from being deleted", async () => {
    await createPlan({ payer_code: OTHER_ADMIN.code });
    const res = await call("DELETE", `/api/accounts/${OTHER_ADMIN.code}`);
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("RELATED_DATA_EXISTS");
  });
});
