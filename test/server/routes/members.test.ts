import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiFailure, ApiSuccess, Member, Plan } from "../../../src/shared/types";
import { todayInVietnam } from "../../../src/server/domain/period";
import { hashPassword } from "../../../src/server/domain/password";
import worker from "../../../src/server/index";

const ADMIN = { code: "AC0000000A", username: "admin", password: "admin-password" };
const ALICE = { code: "AC000000A1", username: "alice", password: "alice-password" };
const BOB = { code: "AC000000B0", username: "bob" };
const CAROL = { code: "AC000000C0", username: "carol" };

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
    insert.bind(ALICE.code, ALICE.username, "Alice", await hashPassword(ALICE.password), "MEMBER"),
    insert.bind(BOB.code, BOB.username, "Bob", hash, "MEMBER"),
    insert.bind(CAROL.code, CAROL.username, "Carol", hash, "MEMBER"),
  ]);
  adminCookie = await login(ADMIN.username, ADMIN.password);
  const res = await call("POST", "/api/plans", {
    name: "YouTube Family",
    price: 185_500,
    cycle: "MONTHLY",
    max_slots: 2,
    payer_code: ADMIN.code,
  });
  plan = ((await res.json()) as ApiSuccess<{ plan: Plan }>).data.plan;
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

async function addMember(userCode: string, extra: Record<string, unknown> = {}): Promise<Response> {
  return call("POST", `/api/plans/${plan.code}/members`, { user_code: userCode, amount: 30_000, ...extra });
}

async function memberOf(res: Response): Promise<Member> {
  return ((await res.json()) as ApiSuccess<{ member: Member }>).data.member;
}

describe("guard", () => {
  it("is admin-only on both mounts", async () => {
    const alice = await login(ALICE.username, ALICE.password);
    expect(await errorCode(await call("GET", `/api/plans/${plan.code}/members`, undefined, alice))).toBe("FORBIDDEN");
    expect(await errorCode(await call("PATCH", "/api/members/MB00000001", { amount: 1 }, alice))).toBe("FORBIDDEN");
  });
});

describe("add", () => {
  it("adds a seat with the admin-set amount, joined today in Vietnam by default", async () => {
    const res = await addMember(ALICE.code);
    expect(res.status).toBe(201);
    const member = await memberOf(res);
    expect(member).toMatchObject({
      user: { code: ALICE.code, username: "alice", display_name: "Alice" },
      amount: 30_000,
      joined_on: todayInVietnam(),
      left_on: null,
    });
    expect(member.code).toMatch(/^MB[0-9A-F]{8}$/);
    expect(JSON.stringify(member)).not.toMatch(/"(id|user_id|plan_id)"/);

    const plans = await call("GET", `/api/plans/${plan.code}`);
    expect(((await plans.json()) as ApiSuccess<{ plan: Plan }>).data.plan.active_members).toBe(1);
  });

  it("accepts a free seat (amount 0) and an explicit join date", async () => {
    const member = await memberOf(await addMember(ALICE.code, { amount: 0, joined_on: "2026-01-15" }));
    expect(member).toMatchObject({ amount: 0, joined_on: "2026-01-15" });
  });

  it("validates the body", async () => {
    const cases: [Record<string, unknown>, string][] = [
      [{ user_code: undefined }, "MISSING_USER_CODE"],
      [{ user_code: "PL00000001" }, "INVALID_USER_CODE"],
      [{ user_code: "ACFFFFFFFF" }, "INVALID_USER_CODE"],
      [{ amount: undefined }, "MISSING_AMOUNT"],
      [{ amount: -1 }, "INVALID_AMOUNT"],
      [{ amount: 1.5 }, "INVALID_AMOUNT"],
      [{ joined_on: "2026-02-30" }, "INVALID_JOINED_ON"],
    ];
    for (const [overrides, code] of cases) {
      const res = await call("POST", `/api/plans/${plan.code}/members`, { user_code: ALICE.code, amount: 30_000, ...overrides });
      expect(res.status, code).toBe(400);
      expect(await errorCode(res)).toBe(code);
    }
  });

  it("never seats the payer in their own plan", async () => {
    const res = await addMember(ADMIN.code);
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("PAYER_CANNOT_BE_MEMBER");
  });

  it("allows one active seat per user", async () => {
    await addMember(ALICE.code);
    const res = await addMember(ALICE.code);
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("DUPLICATE_DATA");
  });

  it("stops at max_slots", async () => {
    expect((await addMember(ALICE.code)).status).toBe(201);
    expect((await addMember(BOB.code)).status).toBe(201);
    const res = await addMember(CAROL.code);
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("PLAN_FULL");
  });

  it("refuses an inactive plan", async () => {
    await call("PATCH", `/api/plans/${plan.code}`, { active: false });
    expect(await errorCode(await addMember(ALICE.code))).toBe("PLAN_INACTIVE");
  });
});

describe("update and leave", () => {
  it("changes the amount", async () => {
    const member = await memberOf(await addMember(ALICE.code));
    const res = await call("PATCH", `/api/members/${member.code}`, { amount: 35_000, user_id: 1, plan_id: 2 });
    expect((await memberOf(res)).amount).toBe(35_000);
    expect(await errorCode(await call("PATCH", `/api/members/${member.code}`, { joined_on: "2026-01-01" }))).toBe("NOTHING_TO_UPDATE");
  });

  it("leaving frees the seat and keeps the row; coming back is a new seat", async () => {
    const alice = await memberOf(await addMember(ALICE.code, { joined_on: "2026-01-01" }));
    await addMember(BOB.code);
    expect(await errorCode(await addMember(CAROL.code))).toBe("PLAN_FULL");

    const left = await call("PATCH", `/api/members/${alice.code}`, { left_on: todayInVietnam() });
    expect((await memberOf(left)).left_on).toBe(todayInVietnam());
    expect((await addMember(CAROL.code)).status).toBe(201);

    const list = await call("GET", `/api/plans/${plan.code}/members`);
    const members = ((await list.json()) as ApiSuccess<{ members: Member[] }>).data.members;
    expect(members.map((m) => m.user.username)).toEqual(["bob", "carol", "alice"]);
    expect(members[2].left_on).not.toBeNull();
  });

  it("validates the leave date", async () => {
    const member = await memberOf(await addMember(ALICE.code, { joined_on: "2026-03-10" }));
    const path = `/api/members/${member.code}`;
    expect(await errorCode(await call("PATCH", path, { left_on: "2026-03-09" }))).toBe("LEFT_BEFORE_JOINED");
    expect(await errorCode(await call("PATCH", path, { left_on: "2999-01-01" }))).toBe("INVALID_LEFT_ON");
    expect(await errorCode(await call("PATCH", path, { left_on: null }))).toBe("MISSING_LEFT_ON");
  });

  it("addresses seats by code only", async () => {
    expect(await errorCode(await call("PATCH", "/api/members/1", { amount: 1 }))).toBe("INVALID_CODE");
    expect(await errorCode(await call("PATCH", `/api/members/${plan.code}`, { amount: 1 }))).toBe("INVALID_CODE");
    expect((await call("PATCH", "/api/members/MBFFFFFFFF", { amount: 1 })).status).toBe(404);
  });
});

describe("plan interplay", () => {
  it("a member cannot then become the payer of the same plan", async () => {
    await env.DB.prepare("UPDATE users SET role = 'ADMIN' WHERE code = ?").bind(BOB.code).run();
    await addMember(BOB.code);
    expect(await errorCode(await call("PATCH", `/api/plans/${plan.code}`, { payer_code: BOB.code }))).toBe("PAYER_IS_MEMBER");
  });

  it("a plan with a seat, even a past one, cannot be deleted", async () => {
    const member = await memberOf(await addMember(ALICE.code, { joined_on: "2026-01-01" }));
    await call("PATCH", `/api/members/${member.code}`, { left_on: "2026-02-01" });
    expect(await errorCode(await call("DELETE", `/api/plans/${plan.code}`))).toBe("RELATED_DATA_EXISTS");
  });
});
