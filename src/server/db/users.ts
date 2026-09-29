import type { Role } from "../../shared/types";

export type UserRow = {
  id: number;
  code: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: Role;
  created_at: string;
};

const COLUMNS = "id, code, username, display_name, password_hash, role, created_at";

// `username` must already be normalized (lowercase) — see domain/username.ts.
export function findUserByUsername(db: D1Database, username: string): Promise<UserRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM users WHERE username = ?`).bind(username).first<UserRow>();
}

export function findUserByCode(db: D1Database, code: string): Promise<UserRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM users WHERE code = ?`).bind(code).first<UserRow>();
}

export async function updateUserPasswordHash(db: D1Database, id: number, passwordHash: string): Promise<void> {
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, id).run();
}
