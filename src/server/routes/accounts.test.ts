import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { Account, ApiFailure, ApiSuccess } from "../../shared/types";
import { hashPassword } from "../domain/password";
import worker from "../index";

const ADMIN = { code: "AC0000000A", username: "admin", password: "admin-password" };
const OTHER_ADMIN = { code: "AC0000000C", username: "admin2", password: "admin2-password" };
const MEMBER = { code: "AC0000000B", username: "member", password: "member-password" };

beforeEach(async () => {
  const insert = env.DB.prepare("INSERT INTO users (code, username, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?)");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM plan_members"),
    env.DB.prepare("DELETE FROM plans"),
    env.DB.prepare("DELETE FROM users"),
    insert.bind(ADMIN.code, ADMIN.username, "Admin", await hashPassword(ADMIN.password), "ADMIN"),
    insert.bind(MEMBER.code, MEMBER.username, "Member", await hashPassword(MEMBER.password), "MEMBER"),
  ]);
});

async function addOtherAdmin() {
  await env.DB.prepare("INSERT INTO users (code, username, display_name, password_hash, role) VALUES (?, ?, 'Admin 2', ?, 'ADMIN')")
    .bind(OTHER_ADMIN.code, OTHER_ADMIN.username, await hashPassword(OTHER_ADMIN.password))
    .run();
}

function call(method: string, path: string, cookie?: string, body?: unknown) {
  const headers: Record<string, string> = {};
  if (cookie) headers.Cookie = cookie;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  return worker.request(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }, env);
}

async function login(username: string, password: string): Promise<string> {
  const res = await call("POST", "/api/auth/login", undefined, { username, password });
  expect(res.status).toBe(200);
  return res.headers.get("Set-Cookie")!.split(";")[0];
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiFailure).error.code;
}

describe("guard", () => {
  it("is admin-only", async () => {
    expect((await call("GET", "/api/accounts")).status).toBe(401);
    const member = await login(MEMBER.username, MEMBER.password);
    expect(await errorCode(await call("GET", "/api/accounts", member))).toBe("FORBIDDEN");
  });

  it("re-reads the role, so a demoted admin loses access with the old token still in hand", async () => {
    await addOtherAdmin();
    const admin = await login(ADMIN.username, ADMIN.password);
    const other = await login(OTHER_ADMIN.username, OTHER_ADMIN.password);
    expect((await call("GET", "/api/accounts", other)).status).toBe(200);

    const demoted = await call("PATCH", `/api/accounts/${OTHER_ADMIN.code}`, admin, { role: "MEMBER" });
    expect(demoted.status).toBe(200);
    expect(await errorCode(await call("GET", "/api/accounts", other))).toBe("FORBIDDEN");

    expect((await call("DELETE", `/api/accounts/${OTHER_ADMIN.code}`, admin)).status).toBe(200);
    expect(await errorCode(await call("GET", "/api/accounts", other))).toBe("UNAUTHORIZED");
  });
});

describe("create", () => {
  it("returns a generated password exactly once and never lists it", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    const res = await call("POST", "/api/accounts", admin, { username: " New.User ", display_name: "New User" });
    expect(res.status).toBe(201);
    const { data } = (await res.json()) as ApiSuccess<{ account: Account; password: string }>;
    expect(data.account).toMatchObject({ username: "new.user", display_name: "New User", role: "MEMBER" });
    expect(data.account.code).toMatch(/^AC[0-9A-F]{8}$/);
    expect(data.password).toHaveLength(16);
    await login("new.user", data.password);

    const list = await (await call("GET", "/api/accounts", admin)).text();
    expect(list).toContain("new.user");
    expect(list).not.toContain(data.password);
    expect(list).not.toContain("pbkdf2");
    expect(list).not.toMatch(/"id"/);
  });

  it("accepts a chosen password and validates the body", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    const chosen = await call("POST", "/api/accounts", admin, { username: "chosen", display_name: "C", password: "chosen-password", role: "ADMIN" });
    expect(((await chosen.json()) as ApiSuccess<{ account: Account; password: string }>).data.password).toBe("chosen-password");
    await login("chosen", "chosen-password");

    expect(await errorCode(await call("POST", "/api/accounts", admin, { username: "x y", display_name: "X" }))).toBe("INVALID_USERNAME");
    expect(await errorCode(await call("POST", "/api/accounts", admin, { username: "xyz" }))).toBe("MISSING_DISPLAY_NAME");
    expect(await errorCode(await call("POST", "/api/accounts", admin, { username: "xyz", display_name: "X", role: "OWNER" }))).toBe("INVALID_ROLE");
    expect(await errorCode(await call("POST", "/api/accounts", admin, { username: "xyz", display_name: "X", password: "short" }))).toBe("PASSWORD_TOO_SHORT");
  });

  it("rejects a taken username, whatever its case", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    const res = await call("POST", "/api/accounts", admin, { username: "MEMBER", display_name: "Dup" });
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("DUPLICATE_DATA");
  });
});

describe("update", () => {
  it("changes only allowlisted fields", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    const res = await call("PATCH", `/api/accounts/${MEMBER.code}`, admin, { display_name: "Renamed", password_hash: "x", id: 999 });
    expect(((await res.json()) as ApiSuccess<{ account: Account }>).data.account.display_name).toBe("Renamed");
    await login(MEMBER.username, MEMBER.password);
    expect(await errorCode(await call("PATCH", `/api/accounts/${MEMBER.code}`, admin, { password_hash: "x" }))).toBe("NOTHING_TO_UPDATE");
  });

  it("never demotes the last admin", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    const res = await call("PATCH", `/api/accounts/${ADMIN.code}`, admin, { role: "MEMBER" });
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("LAST_ADMIN_REQUIRED");
    const row = await env.DB.prepare("SELECT role FROM users WHERE code = ?").bind(ADMIN.code).first<{ role: string }>();
    expect(row?.role).toBe("ADMIN");
  });

  it("keeps a plan's payer an admin", async () => {
    await addOtherAdmin();
    await env.DB.prepare(
      "INSERT INTO plans (code, name, price, cycle, max_slots, payer_id) SELECT 'PL00000001', 'P', 1000, 'MONTHLY', 2, id FROM users WHERE code = ?",
    )
      .bind(OTHER_ADMIN.code)
      .run();
    const admin = await login(ADMIN.username, ADMIN.password);
    const res = await call("PATCH", `/api/accounts/${OTHER_ADMIN.code}`, admin, { role: "MEMBER" });
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("USER_IS_PLAN_PAYER");
    // Renaming the payer is fine.
    expect((await call("PATCH", `/api/accounts/${OTHER_ADMIN.code}`, admin, { display_name: "Payer" })).status).toBe(200);
  });

  it("addresses accounts by code only", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    expect(await errorCode(await call("PATCH", "/api/accounts/1", admin, { display_name: "X" }))).toBe("INVALID_CODE");
    expect(await errorCode(await call("PATCH", "/api/accounts/PL00000001", admin, { display_name: "X" }))).toBe("INVALID_CODE");
    expect((await call("PATCH", "/api/accounts/ACFFFFFFFF", admin, { display_name: "X" })).status).toBe(404);
  });
});

describe("reset-password", () => {
  it("replaces the password without asking for the old one", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    const res = await call("POST", `/api/accounts/${MEMBER.code}/reset-password`, admin, {});
    const { password } = ((await res.json()) as ApiSuccess<{ password: string }>).data;
    expect((await call("POST", "/api/auth/login", undefined, { username: MEMBER.username, password: MEMBER.password })).status).toBe(401);
    await login(MEMBER.username, password);
  });
});

describe("delete", () => {
  it("refuses to delete yourself", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    expect(await errorCode(await call("DELETE", `/api/accounts/${ADMIN.code}`, admin))).toBe("CANNOT_DELETE_SELF");
  });

  it("deletes a member without history, keeps one with plan seats", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    expect((await call("DELETE", `/api/accounts/${MEMBER.code}`, admin)).status).toBe(200);
    expect((await call("DELETE", `/api/accounts/${MEMBER.code}`, admin)).status).toBe(404);

    await addOtherAdmin();
    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO plans (code, name, price, cycle, max_slots, payer_id) SELECT 'PL00000001', 'P', 1000, 'MONTHLY', 2, id FROM users WHERE code = ?",
      ).bind(ADMIN.code),
      env.DB.prepare(
        "INSERT INTO plan_members (code, plan_id, user_id, amount, joined_on) SELECT 'MB00000001', p.id, u.id, 500, '2026-09-01' FROM plans p, users u WHERE u.code = ?",
      ).bind(OTHER_ADMIN.code),
    ]);
    const res = await call("DELETE", `/api/accounts/${OTHER_ADMIN.code}`, admin);
    expect(res.status).toBe(409);
    expect(await errorCode(res)).toBe("RELATED_DATA_EXISTS");
  });
});
