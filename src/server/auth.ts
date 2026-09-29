import type { Context, MiddlewareHandler } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { sign, verify } from "hono/jwt";
import type { Role } from "../shared/types";
import { ApiError, failure } from "./envelope";

// Stateless sessions: a JWT in an httpOnly cookie, no session table. Spec: docs/auth.md.

export type Session = { code: string; role: Role };

export type AppEnv = { Bindings: Env; Variables: { session: Session } };

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const JWT_ALGORITHM = "HS256";

function jwtSecret(c: Context<AppEnv>): string {
  const secret = c.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError("SESSION_NOT_CONFIGURED", "JWT_SECRET is not set.", 503);
  }
  return secret;
}

export async function startSession(c: Context<AppEnv>, session: Session): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const token = await sign(
    { sub: session.code, role: session.role, iat: now, exp: now + SESSION_TTL_SECONDS },
    jwtSecret(c),
    JWT_ALGORITHM,
  );
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function endSession(c: Context<AppEnv>): void {
  deleteCookie(c, SESSION_COOKIE, { path: "/", secure: true, httpOnly: true, sameSite: "Lax" });
}

// Shared by both guards and by /api/auth routes that serve any role. Never rejects:
// an absent, expired or forged token is simply no session.
export async function currentUser(c: Context<AppEnv>): Promise<Session | null> {
  const token = getCookie(c, SESSION_COOKIE);
  const secret = jwtSecret(c);
  if (!token) return null;
  try {
    const payload = await verify(token, secret, JWT_ALGORITHM);
    const role = payload.role;
    if (typeof payload.sub !== "string" || (role !== "ADMIN" && role !== "MEMBER")) return null;
    return { code: payload.sub, role };
  } catch {
    return null;
  }
}

// One guard per role — there is deliberately no role-agnostic requireAuth.
function requireRole(role: Role): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const session = await currentUser(c);
    if (!session) return failure(c, "UNAUTHORIZED", "Not signed in.", 401);
    if (session.role !== role) return failure(c, "FORBIDDEN", "Not allowed for this role.", 403);
    c.set("session", session);
    await next();
  };
}

export const requireAdmin = requireRole("ADMIN");
export const requireMember = requireRole("MEMBER");
