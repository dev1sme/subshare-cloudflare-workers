import type { Role } from "../../shared/types";

export type UserRow = {
  id: number;
  code: string;
  email: string;
  display_name: string;
  password_hash: string;
  role: Role;
  created_at: string;
};

const COLUMNS = "id, code, email, display_name, password_hash, role, created_at";

// email is COLLATE NOCASE, so this matches regardless of case.
export function findUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM users WHERE email = ?`).bind(email).first<UserRow>();
}

export function findUserByCode(db: D1Database, code: string): Promise<UserRow | null> {
  return db.prepare(`SELECT ${COLUMNS} FROM users WHERE code = ?`).bind(code).first<UserRow>();
}

export async function updateUserPasswordHash(db: D1Database, id: number, passwordHash: string): Promise<void> {
  await db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").bind(passwordHash, id).run();
}
