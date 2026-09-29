import { Hono } from "hono";
import type { User } from "../../shared/types";
import { currentUser, endSession, startSession, type AppEnv } from "../auth";
import { type UserRow, findUserByCode, findUserByEmail, updateUserPasswordHash } from "../db/users";
import { DUMMY_PASSWORD_HASH, MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "../domain/password";
import { failure, ok } from "../envelope";
import { fail, readBody, requirePassword, requireString } from "../validate";

// Mounted without a guard: login/logout are public, and me/change-password serve
// both roles, so they resolve the session themselves through currentUser.
export const authRoutes = new Hono<AppEnv>();

function toUser(row: UserRow): User {
  return { code: row.code, email: row.email, display_name: row.display_name, role: row.role };
}

authRoutes.post("/login", async (c) => {
  const body = await readBody(c);
  const email = requireString(body, "email", 254);
  const password = requirePassword(body, "password");

  const row = await findUserByEmail(c.env.DB, email);
  // Always run one PBKDF2 verification so an unknown email costs the same as a wrong password.
  const valid = await verifyPassword(password, row?.password_hash ?? DUMMY_PASSWORD_HASH);
  if (!row || !valid) {
    return failure(c, "INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
  }

  await startSession(c, { code: row.code, role: row.role });
  return ok(c, { user: toUser(row) }, "Signed in.");
});

authRoutes.post("/logout", (c) => {
  endSession(c);
  return ok(c, null, "Signed out.");
});

authRoutes.get("/me", async (c) => {
  const session = await currentUser(c);
  if (!session) return failure(c, "UNAUTHORIZED", "Not signed in.", 401);
  // A deleted account keeps a valid token until it expires; treat it as signed out.
  const row = await findUserByCode(c.env.DB, session.code);
  if (!row) return failure(c, "UNAUTHORIZED", "Not signed in.", 401);
  return ok(c, { user: toUser(row) });
});

// Requires the current password: a session left open on a forgotten device must not be
// enough to lock the real owner out.
authRoutes.post("/change-password", async (c) => {
  const session = await currentUser(c);
  if (!session) return failure(c, "UNAUTHORIZED", "Not signed in.", 401);

  const body = await readBody(c);
  const currentPassword = requirePassword(body, "current_password");
  const newPassword = requirePassword(body, "new_password");
  if (newPassword.length < MIN_PASSWORD_LENGTH) fail("PASSWORD_TOO_SHORT", "New password is too short.");

  const row = await findUserByCode(c.env.DB, session.code);
  if (!row) return failure(c, "UNAUTHORIZED", "Not signed in.", 401);
  if (!(await verifyPassword(currentPassword, row.password_hash))) {
    return failure(c, "WRONG_CURRENT_PASSWORD", "Current password is incorrect.", 400);
  }

  await updateUserPasswordHash(c.env.DB, row.id, await hashPassword(newPassword));
  return ok(c, null, "Password changed.");
});
