import { Hono } from "hono";
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import type { ApiFailure, ApiSuccess, User } from "../../shared/types";
import { type AppEnv, requireAdmin, requireMember } from "../auth";
import { hashPassword } from "../domain/password";
import { handleError, ok } from "../envelope";
import worker from "../index";

const ADMIN = { code: "AC0000000A", username: "admin", password: "admin-password" };
const MEMBER = { code: "AC0000000B", username: "member", password: "member-password" };

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM users"),
    env.DB.prepare(
      "INSERT INTO users (code, username, display_name, password_hash, role) VALUES (?, ?, 'Admin', ?, 'ADMIN'), (?, ?, 'Member', ?, 'MEMBER')",
    ).bind(
      ADMIN.code, ADMIN.username, await hashPassword(ADMIN.password),
      MEMBER.code, MEMBER.username, await hashPassword(MEMBER.password),
    ),
  ]);
});

function post(path: string, body: unknown, cookie?: string) {
  return worker.request(
    path,
    { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json", ...(cookie ? { Cookie: cookie } : {}) } },
    env,
  );
}

async function login(username: string, password: string): Promise<string> {
  const res = await post("/api/auth/login", { username, password });
  expect(res.status).toBe(200);
  return res.headers.get("Set-Cookie")!.split(";")[0];
}

async function errorCode(res: Response): Promise<string> {
  return ((await res.json()) as ApiFailure).error.code;
}

describe("login", () => {
  it("sets an httpOnly, secure, Lax session cookie and returns the user without secrets", async () => {
    const res = await post("/api/auth/login", { username: " Admin ", password: ADMIN.password });
    expect(res.status).toBe(200);
    const cookie = res.headers.get("Set-Cookie")!;
    expect(cookie).toMatch(/^session=/);
    expect(cookie).toMatch(/HttpOnly/);
    expect(cookie).toMatch(/Secure/);
    expect(cookie).toMatch(/SameSite=Lax/);
    const text = JSON.stringify(await res.json());
    expect(text).toContain(ADMIN.code);
    expect(text).not.toContain("password_hash");
    expect(text).not.toContain("pbkdf2");
    expect(text).not.toMatch(/"id"/);
  });

  it("answers unknown username and wrong password identically", async () => {
    const unknown = await post("/api/auth/login", { username: "nobody", password: "whatever-pw" });
    const wrong = await post("/api/auth/login", { username: ADMIN.username, password: "wrong-password" });
    expect(unknown.status).toBe(401);
    expect(wrong.status).toBe(401);
    expect(await errorCode(unknown)).toBe("INVALID_CREDENTIALS");
    expect(await errorCode(wrong)).toBe("INVALID_CREDENTIALS");
    expect(unknown.headers.get("Set-Cookie")).toBeNull();
  });

  it("validates the body", async () => {
    expect(await errorCode(await post("/api/auth/login", { password: "x" }))).toBe("MISSING_USERNAME");
    expect(await errorCode(await post("/api/auth/login", { username: "a b", password: "x" }))).toBe("INVALID_USERNAME");
    expect(await errorCode(await post("/api/auth/login", { username: ADMIN.username }))).toBe("MISSING_PASSWORD");
  });
});

describe("me and logout", () => {
  it("returns the signed-in user and 401 without a valid session", async () => {
    const cookie = await login(MEMBER.username, MEMBER.password);
    const me = await worker.request("/api/auth/me", { headers: { Cookie: cookie } }, env);
    expect(((await me.json()) as ApiSuccess<{ user: User }>).data.user.code).toBe(MEMBER.code);

    const anonymous = await worker.request("/api/auth/me", {}, env);
    expect(anonymous.status).toBe(401);
    const forged = await worker.request("/api/auth/me", { headers: { Cookie: cookie.slice(0, -2) + "xx" } }, env);
    expect(forged.status).toBe(401);
  });

  it("logout expires the cookie", async () => {
    const res = await post("/api/auth/logout", {});
    expect(res.headers.get("Set-Cookie")).toMatch(/session=;.*Max-Age=0/);
  });
});

describe("change-password", () => {
  it("requires the current password and enforces the minimum length", async () => {
    const cookie = await login(MEMBER.username, MEMBER.password);
    const path = "/api/auth/change-password";
    expect((await post(path, { current_password: MEMBER.password, new_password: "x" })).status).toBe(401);
    expect(await errorCode(await post(path, { current_password: "nope-nope", new_password: "new-password-1" }, cookie))).toBe(
      "WRONG_CURRENT_PASSWORD",
    );
    expect(await errorCode(await post(path, { current_password: MEMBER.password, new_password: "short" }, cookie))).toBe(
      "PASSWORD_TOO_SHORT",
    );

    const changed = await post(path, { current_password: MEMBER.password, new_password: "new-password-1" }, cookie);
    expect(changed.status).toBe(200);
    expect((await post("/api/auth/login", { username: MEMBER.username, password: MEMBER.password })).status).toBe(401);
    await login(MEMBER.username, "new-password-1");
  });
});

describe("role guards", () => {
  const app = new Hono<AppEnv>();
  app.onError(handleError);
  app.get("/admin", requireAdmin, (c) => ok(c, c.get("session")));
  app.get("/member", requireMember, (c) => ok(c, c.get("session")));

  it("401 without a session, 403 for the other role, 200 for the right one", async () => {
    const admin = await login(ADMIN.username, ADMIN.password);
    const member = await login(MEMBER.username, MEMBER.password);
    const get = (path: string, cookie?: string) =>
      app.request(path, { headers: cookie ? { Cookie: cookie } : {} }, env);

    expect((await get("/admin")).status).toBe(401);
    expect(await errorCode(await get("/admin", member))).toBe("FORBIDDEN");
    expect((await get("/admin", admin)).status).toBe(200);
    expect(await errorCode(await get("/member", admin))).toBe("FORBIDDEN");
    expect((await get("/member", member)).status).toBe(200);
  });

  it("answers 503 when JWT_SECRET is missing", async () => {
    const res = await app.request("/admin", {}, { ...env, JWT_SECRET: "" });
    expect(res.status).toBe(503);
    expect(await errorCode(res)).toBe("SESSION_NOT_CONFIGURED");
  });
});

describe("users.username CHECK", () => {
  it("rejects what normalizeUsername rejects, at the database too", async () => {
    for (const username of ["Upper", "ab", ".dot", "a b", "a@b"]) {
      await expect(
        env.DB.prepare("INSERT INTO users (code, username, display_name, password_hash) VALUES ('AC000000FF', ?, 'x', 'x')")
          .bind(username)
          .run(),
      ).rejects.toThrow(/CHECK constraint failed/);
    }
  });
});
