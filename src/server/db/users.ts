import type { Role } from "../../shared/types";
import { buildSet } from "./sql";

export type UserRow = {
  id: number;
  code: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: Role;
  created_at: string;
};

// Columns an admin may change through PATCH /api/accounts/:code.
export type UserPatch = Partial<Pick<UserRow, "username" | "display_name" | "role">>;

const COLUMNS = "id, code, username, display_name, password_hash, role, created_at";

// Keeps at least one admin: the row qualifies only if it is not an admin, or other admins remain.
// Inside the same statement as the write, so two concurrent demotions cannot both pass.
const KEEPS_AN_ADMIN = "(role <> 'ADMIN' OR (SELECT COUNT(*) FROM users WHERE role = 'ADMIN') > 1)";

// `username` must already be normalized (lowercase) — see domain/username.ts.
export function findUserByUsername(db: D1Database, username: string): Promise<UserRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM users WHERE username = ?`).bind(username).first<UserRow>();
}

export function findUserByCode(db: D1Database, code: string): Promise<UserRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM users WHERE code = ?`).bind(code).first<UserRow>();
}

export async function listUsers(db: D1Database): Promise<UserRow[]> {
  const { results } = await db.prepare(`SELECT ${COLUMNS} FROM users ORDER BY id`).all<UserRow>();
  return results;
}

export function insertUser(
  db: D1Database,
  user: Pick<UserRow, "code" | "username" | "display_name" | "password_hash" | "role">,
): Promise<UserRow | null> {
  return db
    .prepare(
      `INSERT INTO users (code, username, display_name, password_hash, role) VALUES (?, ?, ?, ?, ?) RETURNING ${COLUMNS}`,
    )
    .bind(user.code, user.username, user.display_name, user.password_hash, user.role)
    .first<UserRow>();
}

// null when the patch would demote the last admin.
export function updateUser(db: D1Database, id: number, patch: UserPatch): Promise<UserRow | null> {
  const set = buildSet(patch);
  const guard = patch.role === "MEMBER" ? ` AND ${KEEPS_AN_ADMIN}` : "";
  return db
    .prepare(`UPDATE users SET ${set.sql} WHERE id = ?${guard} RETURNING ${COLUMNS}`)
    .bind(...set.values, id)
    .first<UserRow>();
}

export async function updateUserPasswordHash(db: D1Database, id: number, passwordHash: string): Promise<void> {
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, id).run();
}

// false when the row is the last admin. FK violations (the user still has money rows) throw.
export async function deleteUser(db: D1Database, id: number): Promise<boolean> {
  const result = await db.prepare(`DELETE FROM users WHERE id = ? AND ${KEEPS_AN_ADMIN}`).bind(id).run();
  return result.meta.changes > 0;
}
