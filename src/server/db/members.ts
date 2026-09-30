import type { Provider } from "../../shared/providers";
// plan_members: seats in a plan. Rows are never deleted — leaving sets left_on.
import { buildSet } from "./sql";

export type MemberRow = {
  id: number;
  code: string;
  plan_id: number;
  user_id: number;
  joined_on: string;
  left_on: string | null;
  user_code: string;
  username: string;
  display_name: string;
};

// Columns an admin may change through PATCH /api/members/:code.
export type MemberPatch = Partial<Pick<MemberRow, "left_on">>;

const SELECT_MEMBER = `
  SELECT m.id, m.code, m.plan_id, m.user_id, m.joined_on, m.left_on,
         u.code AS user_code, u.username, u.display_name
  FROM plan_members m
  JOIN users u ON u.id = m.user_id`;

// Active seats first, then by join date.
export async function listMembersOfPlan(db: D1Database, planId: number): Promise<MemberRow[]> {
  const { results } = await db
    .prepare(`${SELECT_MEMBER} WHERE m.plan_id = ? ORDER BY m.left_on IS NOT NULL, m.joined_on, m.id`)
    .bind(planId)
    .all<MemberRow>();
  return results;
}

export function findMemberByCode(db: D1Database, code: string): Promise<MemberRow | null> {
  return db.prepare(`${SELECT_MEMBER} WHERE m.code = ?`).bind(code).first<MemberRow>();
}

// Inserts only while the plan has a free seat, inside the same statement, so two concurrent adds
// cannot both take the last seat. null = the plan is full. A second active seat for the same user
// violates plan_members_active_unique -> DUPLICATE_DATA.
export async function insertMemberIfSeatFree(
  db: D1Database,
  seat: { code: string; plan_id: number; user_id: number; joined_on: string },
): Promise<MemberRow | null> {
  const [, selected] = await db.batch<MemberRow>([
    db
      .prepare(
        `INSERT INTO plan_members (code, plan_id, user_id, joined_on)
         SELECT ?, p.id, ?, ?
         FROM plans p
         WHERE p.id = ?
           AND (SELECT COUNT(*) FROM plan_members m WHERE m.plan_id = p.id AND m.left_on IS NULL) < p.max_slots`,
      )
      .bind(seat.code, seat.user_id, seat.joined_on, seat.plan_id),
    db.prepare(`${SELECT_MEMBER} WHERE m.code = ?`).bind(seat.code),
  ]);
  return selected.results[0] ?? null;
}

export async function updateMember(db: D1Database, id: number, patch: MemberPatch): Promise<MemberRow> {
  const set = buildSet(patch);
  if (!set) throw new Error("updateMember: empty patch");
  const [, selected] = await db.batch<MemberRow>([
    db.prepare(`UPDATE plan_members SET ${set.clause} WHERE id = ?`).bind(...set.values, id),
    db.prepare(`${SELECT_MEMBER} WHERE m.id = ?`).bind(id),
  ]);
  return selected.results[0];
}

export type SeatRow = {
  plan_id: number;
  plan_code: string;
  plan_name: string;
  plan_provider: Provider;
  member_amount: number;
  user_id: number;
};

// The plans a member holds an active seat in, for /api/me. Active plans only.
export async function listSeatsOfUser(db: D1Database, userCode: string): Promise<SeatRow[]> {
  const { results } = await db
    .prepare(
      `SELECT p.id AS plan_id, p.code AS plan_code, p.name AS plan_name, p.provider AS plan_provider, p.member_amount, m.user_id
       FROM plan_members m JOIN plans p ON p.id = m.plan_id
       WHERE m.user_id = (SELECT id FROM users WHERE code = ?) AND m.left_on IS NULL AND p.active = 1
       ORDER BY p.name COLLATE NOCASE`,
    )
    .bind(userCode)
    .all<SeatRow>();
  return results;
}
