import { Hono } from "hono";
import type { Account, Role } from "../../shared/types";
import { requireAdmin, type AppEnv } from "../auth";
import {
  type UserPatch,
  type UserRow,
  deleteUser,
  findUserByCode,
  insertUser,
  listUsers,
  updateUser,
  updateUserPasswordHash,
} from "../db/users";
import { CODE_PREFIX, generateCode } from "../domain/code";
import { MIN_PASSWORD_LENGTH, generatePassword, hashPassword } from "../domain/password";
import { failure, notFound, ok } from "../envelope";
import { type Body, fail, has, parseCode, readBody, requireEnum, requirePassword, requireString, requireUsername } from "../validate";

// Admin-only account management. There is no self-registration: an admin creates every account
// and hands the password over. Spec: docs/auth.md, docs/api.md.
export const accountRoutes = new Hono<AppEnv>();

accountRoutes.use(requireAdmin);

const ROLES: readonly Role[] = ["ADMIN", "MEMBER"];
const DISPLAY_NAME_MAX = 64;

function toAccount(row: UserRow): Account {
  return { code: row.code, username: row.username, display_name: row.display_name, role: row.role, created_at: row.created_at };
}

// A chosen password, or a generated one. Either way it is returned exactly once and never stored.
function chosenOrGeneratedPassword(body: Body): string {
  if (!has(body, "password") || body.password === null) return generatePassword();
  const password = requirePassword(body, "password");
  if (password.length < MIN_PASSWORD_LENGTH) fail("PASSWORD_TOO_SHORT", "Password is too short.");
  return password;
}

async function loadAccount(db: D1Database, rawCode: string): Promise<UserRow | null> {
  return findUserByCode(db, parseCode(CODE_PREFIX.user, rawCode));
}

accountRoutes.get("/", async (c) => {
  const rows = await listUsers(c.env.DB);
  return ok(c, { accounts: rows.map(toAccount) });
});

accountRoutes.post("/", async (c) => {
  const body = await readBody(c);
  const username = requireUsername(body);
  const displayName = requireString(body, "display_name", DISPLAY_NAME_MAX);
  const role = has(body, "role") ? requireEnum(body, "role", ROLES) : "MEMBER";
  const password = chosenOrGeneratedPassword(body);

  // A taken username surfaces as the UNIQUE violation -> 409 DUPLICATE_DATA.
  const row = await insertUser(c.env.DB, {
    code: generateCode(CODE_PREFIX.user),
    username,
    display_name: displayName,
    password_hash: await hashPassword(password),
    role,
  });
  if (!row) throw new Error("INSERT ... RETURNING returned no row");
  return ok(c, { account: toAccount(row), password }, "Account created.", 201);
});

accountRoutes.patch("/:code", async (c) => {
  const account = await loadAccount(c.env.DB, c.req.param("code"));
  if (!account) return notFound(c);

  const body = await readBody(c);
  // Built field by field from the allowlist — never from the body itself.
  const patch: UserPatch = {};
  if (has(body, "username")) patch.username = requireUsername(body);
  if (has(body, "display_name")) patch.display_name = requireString(body, "display_name", DISPLAY_NAME_MAX);
  if (has(body, "role")) patch.role = requireEnum(body, "role", ROLES);
  if (Object.keys(patch).length === 0) fail("NOTHING_TO_UPDATE", "No updatable field was sent.");

  const row = await updateUser(c.env.DB, account.id, patch);
  if (!row) return failure(c, "LAST_ADMIN_REQUIRED", "At least one admin must remain.", 409);
  return ok(c, { account: toAccount(row) }, "Account updated.");
});

// Does not require the current password (that is self-service change-password). Existing sessions
// stay valid until they expire — sessions are stateless.
accountRoutes.post("/:code/reset-password", async (c) => {
  const account = await loadAccount(c.env.DB, c.req.param("code"));
  if (!account) return notFound(c);

  const body = await readBody(c);
  const password = chosenOrGeneratedPassword(body);
  await updateUserPasswordHash(c.env.DB, account.id, await hashPassword(password));
  return ok(c, { password }, "Password reset.");
});

accountRoutes.delete("/:code", async (c) => {
  const account = await loadAccount(c.env.DB, c.req.param("code"));
  if (!account) return notFound(c);
  if (account.code === c.get("session").code) {
    return failure(c, "CANNOT_DELETE_SELF", "You cannot delete your own account.", 409);
  }

  // A user with plan seats or payments is kept by the FKs -> 409 RELATED_DATA_EXISTS.
  if (!(await deleteUser(c.env.DB, account.id))) {
    return failure(c, "LAST_ADMIN_REQUIRED", "At least one admin must remain.", 409);
  }
  return ok(c, null, "Account deleted.");
});
