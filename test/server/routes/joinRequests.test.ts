import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiFailure, ApiSuccess, JoinRequest, Member, OpenPlan, Plan } from "../../../src/shared/types";
import { hashPassword } from "../../../src/server/domain/password";
import { app as worker } from "../../../src/server/index";

const ADMIN = { code: "AC0000000A", username: "admin", password: "admin-password" };
const ALICE = { code: "AC000000A1", username: "alice", password: "alice-password" };
const BOB = { code: "AC000000B0", username: "bob", password: "bob-password" };
const CAROL = { code: "AC000000C0", username: "carol", password: "carol-password" };

let adminCookie = "";
let aliceCookie = "";
let bobCookie = "";
let plan: Plan;

beforeEach(async () => {
  const insert = env.DB.prepare("INSERT INTO users (code, username, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM join_requests"),
    env.DB.prepare("DELETE FROM plan_members"),
    env.DB.prepare("DELETE FROM plans"),
    env.DB.prepare("DELETE FROM users"),
    insert.bind(ADMIN.code, ADMIN.username, "Admin", await hashPassword(ADMIN.password), "ADMIN"),
    insert.bind(ALICE.code, ALICE.username, "Alice", await hashPassword(ALICE.password), "MEMBER"),
    insert.bind(BOB.code, BOB.username, "Bob", await hashPassword(BOB.password), "MEMBER"),
    insert.bind(CAROL.code, CAROL.username, "Carol", await hashPassword(CAROL.password), "MEMBER"),
  ]);
  adminCookie = await login(ADMIN.username, ADMIN.password);
  aliceCookie = await login(ALICE.username, ALICE.password);
  bobCookie = await login(BOB.username, BOB.password);
  plan = await createPlan({ accepting_requests: true });
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

async function data<T>(res: Response): Promise<T> {
  return ((await res.json()) as ApiSuccess<T>).data;
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiFailure).error.code;
}

async function createPlan(extra: Record<string, unknown> = {}): Promise<Plan> {
  const res = await call("POST", "/api/plans", {
    name: `Plan ${Math.random()}`,
    price: 180_000,
    member_amount: 37_000,
    cycle: "MONTHLY",
    max_slots: 2,
    payer_code: ADMIN.code,
    ...extra,
  });
  return (await data<{ plan: Plan }>(res)).plan;
}

async function ask(cookie: string, planCode = plan.code, note?: string): Promise<Response> {
  return call("POST", "/api/me/join-requests", { plan_code: planCode, ...(note === undefined ? {} : { note }) }, cookie);
}

async function requestOf(res: Response): Promise<JoinRequest> {
  return (await data<{ join_request: JoinRequest }>(res)).join_request;
}

async function openPlans(cookie: string): Promise<OpenPlan[]> {
  return (await data<{ plans: OpenPlan[] }>(await call("GET", "/api/me/open-plans", undefined, cookie))).plans;
}

describe("guards", () => {
  it("admin routes are admin-only, member routes member-only", async () => {
    expect(await errorCode(await call("GET", "/api/join-requests", undefined, aliceCookie))).toBe("FORBIDDEN");
    expect(await errorCode(await call("POST", "/api/join-requests/JR00000001/approve", undefined, aliceCookie))).toBe("FORBIDDEN");
    expect(await errorCode(await call("GET", "/api/me/open-plans"))).toBe("FORBIDDEN");
  });
});

describe("accepting_requests on plans", () => {
  it("is off unless asked for, and can be toggled", async () => {
    const closed = await createPlan();
    expect(closed.accepting_requests).toBe(false);
    expect(plan.accepting_requests).toBe(true);
    const res = await call("PATCH", `/api/plans/${closed.code}`, { accepting_requests: true });
    expect((await data<{ plan: Plan }>(res)).plan.accepting_requests).toBe(true);
    expect(await errorCode(await call("PATCH", `/api/plans/${closed.code}`, { accepting_requests: "yes" }))).toBe(
      "INVALID_ACCEPTING_REQUESTS",
    );
  });
});

describe("open plans", () => {
  it("lists only active plans accepting requests, without the member's own", async () => {
    await createPlan(); // closed
    await createPlan({ accepting_requests: true, active: false }); // inactive
    const mine = await createPlan({ accepting_requests: true });
    await call("POST", `/api/plans/${mine.code}/members`, { user_code: ALICE.code });

    const plans = await openPlans(aliceCookie);
    expect(plans.map((p) => p.code)).toEqual([plan.code]);
    expect(plans[0]).toMatchObject({ member_amount: 37_000, max_slots: 2, active_members: 0, pending_request_code: null });
  });

  it("shows the member's own pending request, not another member's", async () => {
    const request = await requestOf(await ask(aliceCookie));
    expect((await openPlans(aliceCookie))[0].pending_request_code).toBe(request.code);
    expect((await openPlans(bobCookie))[0].pending_request_code).toBeNull();
  });
});

describe("asking", () => {
  it("creates a pending request with an optional note", async () => {
    const res = await ask(aliceCookie, plan.code, "  Cho mình vào với  ");
    expect(res.status).toBe(201);
    expect(await requestOf(res)).toMatchObject({
      status: "PENDING",
      note: "Cho mình vào với",
      plan: { code: plan.code },
      user: { code: ALICE.code },
      decided_at: null,
    });
  });

  it("refuses a second pending request, a closed plan, a plan already joined, a full plan", async () => {
    await ask(aliceCookie);
    expect(await errorCode(await ask(aliceCookie))).toBe("JOIN_REQUEST_EXISTS");

    const closed = await createPlan();
    const res = await ask(aliceCookie, closed.code);
    expect(res.status).toBe(404);
    expect(await errorCode(res)).toBe("PLAN_NOT_OPEN");

    await call("POST", `/api/plans/${plan.code}/members`, { user_code: BOB.code });
    expect(await errorCode(await ask(bobCookie))).toBe("ALREADY_MEMBER");

    await call("POST", `/api/plans/${plan.code}/members`, { user_code: CAROL.code });
    const carol = await login(CAROL.username, CAROL.password);
    const other = await createPlan({ accepting_requests: true, max_slots: 1 });
    await call("POST", `/api/plans/${other.code}/members`, { user_code: BOB.code });
    expect(await errorCode(await ask(carol, other.code))).toBe("PLAN_FULL");
  });

  it("validates the body", async () => {
    expect(await errorCode(await call("POST", "/api/me/join-requests", {}, aliceCookie))).toBe("MISSING_PLAN_CODE");
    expect(await errorCode(await ask(aliceCookie, "AC000000A1"))).toBe("INVALID_PLAN_CODE");
    expect(await errorCode(await ask(aliceCookie, plan.code, "x".repeat(201)))).toBe("TOO_LONG_NOTE");
  });
});

describe("cancelling", () => {
  it("withdraws an own pending request once; another member's is 404", async () => {
    const request = await requestOf(await ask(aliceCookie));
    expect(await errorCode(await call("POST", `/api/me/join-requests/${request.code}/cancel`, undefined, bobCookie))).toBe(
      "NOT_FOUND",
    );
    const res = await call("POST", `/api/me/join-requests/${request.code}/cancel`, undefined, aliceCookie);
    expect((await requestOf(res)).status).toBe("CANCELLED");
    expect(await errorCode(await call("POST", `/api/me/join-requests/${request.code}/cancel`, undefined, aliceCookie))).toBe(
      "INVALID_STATUS_TRANSITION",
    );
    // A cancelled request does not block asking again.
    expect((await ask(aliceCookie)).status).toBe(201);
  });
});

describe("admin", () => {
  it("lists pending requests oldest first; other statuses on demand", async () => {
    const first = await requestOf(await ask(aliceCookie));
    const second = await requestOf(await ask(bobCookie));
    const pending = await data<{ join_requests: JoinRequest[] }>(await call("GET", "/api/join-requests"));
    expect(pending.join_requests.map((r) => r.code)).toEqual([first.code, second.code]);
    expect(await errorCode(await call("GET", "/api/join-requests?status=DONE"))).toBe("INVALID_STATUS");
  });

  it("approving creates the seat and closes the request", async () => {
    const request = await requestOf(await ask(aliceCookie));
    const res = await call("POST", `/api/join-requests/${request.code}/approve`, { joined_on: "2026-10-01" });
    const approved = await requestOf(res);
    expect(approved.status).toBe("APPROVED");
    expect(approved.plan.active_members).toBe(1);

    const members = await data<{ members: Member[] }>(await call("GET", `/api/plans/${plan.code}/members`));
    expect(members.members).toMatchObject([{ user: { code: ALICE.code }, joined_on: "2026-10-01", left_on: null }]);
    expect(await openPlans(aliceCookie)).toEqual([]);

    expect(await errorCode(await call("POST", `/api/join-requests/${request.code}/approve`))).toBe("INVALID_STATUS_TRANSITION");
    expect(await errorCode(await call("POST", `/api/join-requests/${request.code}/reject`))).toBe("INVALID_STATUS_TRANSITION");
  });

  it("does not approve past the seat limit; the request stays pending", async () => {
    const small = await createPlan({ accepting_requests: true, max_slots: 1 });
    const alice = await requestOf(await ask(aliceCookie, small.code));
    const bob = await requestOf(await ask(bobCookie, small.code));
    expect((await call("POST", `/api/join-requests/${alice.code}/approve`)).status).toBe(200);
    expect(await errorCode(await call("POST", `/api/join-requests/${bob.code}/approve`))).toBe("PLAN_FULL");
    const pending = await data<{ join_requests: JoinRequest[] }>(await call("GET", "/api/join-requests"));
    expect(pending.join_requests.map((r) => r.code)).toEqual([bob.code]);
  });

  it("refuses approving a member who got a seat meanwhile, or into an inactive plan", async () => {
    const request = await requestOf(await ask(aliceCookie));
    await call("POST", `/api/plans/${plan.code}/members`, { user_code: ALICE.code });
    expect(await errorCode(await call("POST", `/api/join-requests/${request.code}/approve`))).toBe("ALREADY_MEMBER");

    const bob = await requestOf(await ask(bobCookie));
    await call("PATCH", `/api/plans/${plan.code}`, { active: false });
    expect(await errorCode(await call("POST", `/api/join-requests/${bob.code}/approve`))).toBe("PLAN_INACTIVE");
  });

  it("never seats a requester who became the plan's payer, and a double ask is JOIN_REQUEST_EXISTS", async () => {
    const request = await requestOf(await ask(aliceCookie));
    expect(await errorCode(await ask(aliceCookie))).toBe("JOIN_REQUEST_EXISTS");
    // Alice has no seat, so the payer change is allowed; the pending request must not seat her.
    await call("PATCH", `/api/accounts/${ALICE.code}`, { role: "ADMIN" });
    expect((await call("PATCH", `/api/plans/${plan.code}`, { payer_code: ALICE.code })).status).toBe(200);
    expect(await errorCode(await call("POST", `/api/join-requests/${request.code}/approve`))).toBe("PAYER_CANNOT_BE_MEMBER");
    const members = await data<{ members: Member[] }>(await call("GET", `/api/plans/${plan.code}/members`));
    expect(members.members).toEqual([]);
  });

  it("lets an admin who decided a request be deleted later (decided_by becomes null)", async () => {
    await call("POST", "/api/accounts", { username: "second", display_name: "Second", role: "ADMIN", password: "second-password" });
    const second = await login("second", "second-password");
    const request = await requestOf(await ask(aliceCookie));
    expect((await call("POST", `/api/join-requests/${request.code}/reject`, undefined, second)).status).toBe(200);
    const secondCode = (await env.DB.prepare("SELECT code FROM users WHERE username = 'second'").first<{ code: string }>())!.code;
    expect((await call("DELETE", `/api/accounts/${secondCode}`)).status).toBe(200);
    const row = await env.DB.prepare("SELECT status, decided_by FROM join_requests WHERE code = ?").bind(request.code).first();
    expect(row).toEqual({ status: "REJECTED", decided_by: null });
  });

  it("rejects, and a cancelled request cannot be approved", async () => {
    const alice = await requestOf(await ask(aliceCookie));
    expect((await requestOf(await call("POST", `/api/join-requests/${alice.code}/reject`))).status).toBe("REJECTED");

    const bob = await requestOf(await ask(bobCookie));
    await call("POST", `/api/me/join-requests/${bob.code}/cancel`, undefined, bobCookie);
    expect(await errorCode(await call("POST", `/api/join-requests/${bob.code}/approve`))).toBe("INVALID_STATUS_TRANSITION");
  });

  it("addresses requests by code only", async () => {
    expect(await errorCode(await call("POST", "/api/join-requests/1/approve"))).toBe("INVALID_CODE");
    expect(await errorCode(await call("POST", `/api/join-requests/${plan.code}/approve`))).toBe("INVALID_CODE");
    expect(await errorCode(await call("POST", "/api/join-requests/JR00000000/approve"))).toBe("NOT_FOUND");
  });

  it("deleting a plan without seats takes its requests along", async () => {
    await ask(aliceCookie);
    expect((await call("DELETE", `/api/plans/${plan.code}`)).status).toBe(200);
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM join_requests").first<{ n: number }>();
    expect(row?.n).toBe(0);
  });
});
