import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiFailure, ApiSuccess, JoinRequest, MyWish, OpenPlan, Plan, Wish } from "../../../src/shared/types";
import { hashPassword } from "../../../src/server/domain/password";
import { app as worker } from "../../../src/server/index";

const ADMIN = { code: "AC0000000A", username: "admin", password: "admin-password" };
const ALICE = { code: "AC000000A1", username: "alice", password: "alice-password" };
const BOB = { code: "AC000000B0", username: "bob", password: "bob-password" };
const CAROL = { code: "AC000000C0", username: "carol", password: "carol-password" };

let adminCookie = "";
let aliceCookie = "";
let bobCookie = "";
let carolCookie = "";

beforeEach(async () => {
  const insert = env.DB.prepare("INSERT INTO users (code, username, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM plan_wishes"),
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
  carolCookie = await login(CAROL.username, CAROL.password);
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

async function wish(cookie: string, body: Record<string, unknown>): Promise<Response> {
  return call("POST", "/api/me/wishes", body, cookie);
}

async function wishOf(res: Response): Promise<MyWish> {
  return (await data<{ wish: MyWish }>(res)).wish;
}

async function myWishes(cookie: string): Promise<MyWish[]> {
  return (await data<{ wishes: MyWish[] }>(await call("GET", "/api/me/wishes", undefined, cookie))).wishes;
}

async function openPlans(cookie: string): Promise<OpenPlan[]> {
  return (await data<{ plans: OpenPlan[] }>(await call("GET", "/api/me/open-plans", undefined, cookie))).plans;
}

async function openPlan(wishCodes: string[], extra: Record<string, unknown> = {}) {
  const res = await call("POST", "/api/plans", {
    name: "YouTube 2",
    provider: "YOUTUBE",
    price: 185_000,
    member_amount: 37_000,
    cycle: "MONTHLY",
    max_slots: 5,
    payer_code: ADMIN.code,
    accepting_requests: true,
    wish_codes: wishCodes,
    ...extra,
  });
  return { status: res.status, ...(await data<{ plan: Plan; wishes_fulfilled: number }>(res)) };
}

describe("guards", () => {
  it("member routes are member-only, admin routes admin-only", async () => {
    expect(await errorCode(await call("GET", "/api/me/wishes"))).toBe("FORBIDDEN");
    expect(await errorCode(await call("GET", "/api/wishes", undefined, aliceCookie))).toBe("FORBIDDEN");
    expect(await errorCode(await call("POST", "/api/wishes/PW00000001/decline", undefined, aliceCookie))).toBe("FORBIDDEN");
  });
});

describe("member wishes", () => {
  it("asks for a listed provider (no name kept) or a named other service", async () => {
    const youtube = await wishOf(await wish(aliceCookie, { provider: "YOUTUBE", service_name: "ignored", note: "  Family please  " }));
    expect(youtube).toMatchObject({ provider: "YOUTUBE", service_name: null, note: "Family please", status: "OPEN", others_waiting: 0, plan: null });
    expect(youtube.code).toMatch(/^PW[0-9A-F]{8}$/);
    const other = await wishOf(await wish(aliceCookie, { provider: "OTHER", service_name: "  Coursera Plus " }));
    expect(other.service_name).toBe("Coursera Plus");
  });

  it("validates the body", async () => {
    expect(await errorCode(await wish(aliceCookie, {}))).toBe("MISSING_PROVIDER");
    expect(await errorCode(await wish(aliceCookie, { provider: "HBO" }))).toBe("INVALID_PROVIDER");
    expect(await errorCode(await wish(aliceCookie, { provider: "OTHER" }))).toBe("MISSING_SERVICE_NAME");
    expect(await errorCode(await wish(aliceCookie, { provider: "OTHER", service_name: "x".repeat(65) }))).toBe("TOO_LONG_SERVICE_NAME");
    expect(await errorCode(await wish(aliceCookie, { provider: "NETFLIX", note: "x".repeat(201) }))).toBe("TOO_LONG_NOTE");
  });

  it("keeps one open wish per service, other services grouped by name whatever the case and spacing", async () => {
    await wish(aliceCookie, { provider: "YOUTUBE" });
    expect(await errorCode(await wish(aliceCookie, { provider: "YOUTUBE" }))).toBe("WISH_EXISTS");
    await wish(aliceCookie, { provider: "OTHER", service_name: "Coursera  Plus" });
    expect(await errorCode(await wish(aliceCookie, { provider: "OTHER", service_name: "coursera plus" }))).toBe("WISH_EXISTS");
    expect((await wish(aliceCookie, { provider: "OTHER", service_name: "Udemy" })).status).toBe(201);
  });

  it("tells how many others wait for the same service, never who", async () => {
    await wish(aliceCookie, { provider: "YOUTUBE" });
    await wish(bobCookie, { provider: "YOUTUBE" });
    await wish(carolCookie, { provider: "NETFLIX" });
    const [alice] = await myWishes(aliceCookie);
    expect(alice.others_waiting).toBe(1);
    expect(JSON.stringify(alice)).not.toMatch(/bob/i);
  });

  it("cancels an own open wish once, then can ask again; another member's is 404", async () => {
    const mine = await wishOf(await wish(aliceCookie, { provider: "YOUTUBE" }));
    expect(await errorCode(await call("POST", `/api/me/wishes/${mine.code}/cancel`, undefined, bobCookie))).toBe("NOT_FOUND");
    expect((await wishOf(await call("POST", `/api/me/wishes/${mine.code}/cancel`, undefined, aliceCookie))).status).toBe("CANCELLED");
    expect(await errorCode(await call("POST", `/api/me/wishes/${mine.code}/cancel`, undefined, aliceCookie))).toBe(
      "INVALID_STATUS_TRANSITION",
    );
    expect((await wish(aliceCookie, { provider: "YOUTUBE" })).status).toBe(201);
  });
});

describe("admin", () => {
  it("lists open wishes oldest first with who asked, and declines one once", async () => {
    const alice = await wishOf(await wish(aliceCookie, { provider: "YOUTUBE", note: "hi" }));
    await wish(bobCookie, { provider: "OTHER", service_name: "Coursera" });
    const { wishes } = await data<{ wishes: Wish[] }>(await call("GET", "/api/wishes"));
    expect(wishes.map((w) => [w.user.username, w.provider])).toEqual([
      ["alice", "YOUTUBE"],
      ["bob", "OTHER"],
    ]);
    expect((await data<{ wish: Wish }>(await call("POST", `/api/wishes/${alice.code}/decline`))).wish.status).toBe("DECLINED");
    expect(await errorCode(await call("POST", `/api/wishes/${alice.code}/decline`))).toBe("INVALID_STATUS_TRANSITION");
    expect((await myWishes(aliceCookie))[0].status).toBe("DECLINED");
  });

  it("opens a plan from wishes: fulfils the open ones, skips the others, sets a 48-hour head start", async () => {
    const alice = await wishOf(await wish(aliceCookie, { provider: "YOUTUBE" }));
    const bob = await wishOf(await wish(bobCookie, { provider: "YOUTUBE" }));
    const carol = await wishOf(await wish(carolCookie, { provider: "YOUTUBE" }));
    await call("POST", `/api/wishes/${carol.code}/decline`);

    const before = Date.now();
    const opened = await openPlan([alice.code, bob.code, carol.code, alice.code]);
    expect(opened.status).toBe(201);
    expect(opened.wishes_fulfilled).toBe(2);
    const head = Date.parse(opened.plan.priority_until!) - before;
    expect(head).toBeGreaterThan(47.9 * 3600_000);
    expect(head).toBeLessThan(48.1 * 3600_000);

    const [aliceWish] = await myWishes(aliceCookie);
    expect(aliceWish).toMatchObject({ status: "FULFILLED", seen: false, others_waiting: 0 });
    expect(aliceWish.plan).toMatchObject({ code: opened.plan.code, open: true, free_seats: 5, joined: false });
    expect((await myWishes(carolCookie))[0].status).toBe("DECLINED");
  });

  it("refuses malformed wish codes, and a plan without wishes has no head start", async () => {
    expect(await errorCode(await call("POST", "/api/plans", { name: "x", price: 1, member_amount: 1, cycle: "MONTHLY", max_slots: 1, payer_code: ADMIN.code, wish_codes: ["JR00000001"] }))).toBe("INVALID_WISH_CODES");
    expect(await errorCode(await call("POST", "/api/plans", { name: "x", price: 1, member_amount: 1, cycle: "MONTHLY", max_slots: 1, payer_code: ADMIN.code, wish_codes: "PW00000001" }))).toBe("INVALID_WISH_CODES");
    const plain = await openPlan([]);
    expect(plain.plan.priority_until).toBeNull();
    expect(plain.wishes_fulfilled).toBe(0);
  });
});

describe("head start", () => {
  it("only the wishers may ask during it; everyone after it ends", async () => {
    const alice = await wishOf(await wish(aliceCookie, { provider: "YOUTUBE" }));
    const { plan } = await openPlan([alice.code]);

    expect(await errorCode(await call("POST", "/api/me/join-requests", { plan_code: plan.code }, carolCookie))).toBe("PLAN_PRIORITY_ONLY");
    const asked = await call("POST", "/api/me/join-requests", { plan_code: plan.code }, aliceCookie);
    expect(asked.status).toBe(201);
    expect((await data<{ join_request: JoinRequest }>(asked)).join_request.status).toBe("PENDING");

    const [forAlice] = (await openPlans(aliceCookie)).filter((p) => p.code === plan.code);
    const [forCarol] = (await openPlans(carolCookie)).filter((p) => p.code === plan.code);
    expect(forAlice).toMatchObject({ priority_for_me: true, pending_requests: 0 });
    expect(forCarol).toMatchObject({ priority_for_me: false, pending_requests: 1 });
    expect((await myWishes(aliceCookie))[0].plan?.joined).toBe(true);

    await env.DB.prepare("UPDATE plans SET priority_until = '2000-01-01T00:00:00Z' WHERE code = ?").bind(plan.code).run();
    expect((await call("POST", "/api/me/join-requests", { plan_code: plan.code }, carolCookie)).status).toBe(201);
  });

  it("marks the notice seen only for a fulfilled wish, and a deleted plan leaves the wish without one", async () => {
    const open = await wishOf(await wish(bobCookie, { provider: "NETFLIX" }));
    expect((await wishOf(await call("POST", `/api/me/wishes/${open.code}/seen`, undefined, bobCookie))).seen).toBe(false);

    const alice = await wishOf(await wish(aliceCookie, { provider: "YOUTUBE" }));
    const { plan } = await openPlan([alice.code]);
    expect((await wishOf(await call("POST", `/api/me/wishes/${alice.code}/seen`, undefined, aliceCookie))).seen).toBe(true);
    expect(await errorCode(await call("POST", `/api/me/wishes/${alice.code}/seen`, undefined, bobCookie))).toBe("NOT_FOUND");

    expect((await call("DELETE", `/api/plans/${plan.code}`)).status).toBe(200);
    expect((await myWishes(aliceCookie))[0]).toMatchObject({ status: "FULFILLED", plan: null });
  });
});
