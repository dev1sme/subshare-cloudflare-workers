// join_requests: a member asks for a seat in an open plan; an admin approves (creating the seat)
// or rejects. Every status change is guarded inside its own UPDATE (… AND status = 'PENDING'), so
// two admins, or an admin and the member cancelling, cannot both win. Spec: docs/data-model.md.
import type { Cycle, JoinRequestStatus } from "../../shared/types";

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

export type JoinRequestRow = {
  id: number;
  code: string;
  plan_id: number;
  user_id: number;
  status: JoinRequestStatus;
  note: string | null;
  created_at: string;
  decided_at: string | null;
  plan_code: string;
  plan_name: string;
  member_amount: number;
  max_slots: number;
  plan_active: number;
  active_members: number;
  user_code: string;
  username: string;
  display_name: string;
};

const SELECT_REQUEST = `
  SELECT r.id, r.code, r.plan_id, r.user_id, r.status, r.note, r.created_at, r.decided_at,
         p.code AS plan_code, p.name AS plan_name, p.member_amount, p.max_slots, p.active AS plan_active,
         (SELECT COUNT(*) FROM plan_members m WHERE m.plan_id = p.id AND m.left_on IS NULL) AS active_members,
         u.code AS user_code, u.username, u.display_name
  FROM join_requests r
  JOIN plans p ON p.id = r.plan_id
  JOIN users u ON u.id = r.user_id`;

export function findJoinRequestByCode(db: D1Database, code: string): Promise<JoinRequestRow | null> {
  return db.prepare(`${SELECT_REQUEST} WHERE r.code = ?`).bind(code).first<JoinRequestRow>();
}

// The admin's queue: pending ones oldest first (first come, first served), history newest first.
export async function listJoinRequests(db: D1Database, status: JoinRequestStatus): Promise<JoinRequestRow[]> {
  const order = status === "PENDING" ? "r.created_at, r.id" : "r.created_at DESC, r.id DESC";
  const { results } = await db
    .prepare(`${SELECT_REQUEST} WHERE r.status = ? ORDER BY ${order} LIMIT 200`)
    .bind(status)
    .all<JoinRequestRow>();
  return results;
}

export async function listJoinRequestsOfUser(db: D1Database, userCode: string): Promise<JoinRequestRow[]> {
  const { results } = await db
    .prepare(`${SELECT_REQUEST} WHERE r.user_id = (SELECT id FROM users WHERE code = ?) ORDER BY r.created_at DESC, r.id DESC LIMIT 100`)
    .bind(userCode)
    .all<JoinRequestRow>();
  return results;
}

export type OpenPlanRow = {
  plan_code: string;
  plan_name: string;
  member_amount: number;
  cycle: Cycle;
  max_slots: number;
  active_members: number;
  pending_request_code: string | null;
};

// Plans a member may ask to join: active, accepting requests, and without their active seat.
// Scans plans on purpose — a handful of rows; the seat and request lookups use their indexes.
export async function listOpenPlansForUser(db: D1Database, userCode: string): Promise<OpenPlanRow[]> {
  const { results } = await db
    .prepare(
      `SELECT p.code AS plan_code, p.name AS plan_name, p.member_amount, p.cycle, p.max_slots,
              (SELECT COUNT(*) FROM plan_members m WHERE m.plan_id = p.id AND m.left_on IS NULL) AS active_members,
              (SELECT r.code FROM join_requests r WHERE r.plan_id = p.id AND r.user_id = u.id AND r.status = 'PENDING') AS pending_request_code
       FROM plans p, (SELECT id FROM users WHERE code = ?) u
       WHERE p.active = 1 AND p.accepting_requests = 1
         AND NOT EXISTS (SELECT 1 FROM plan_members m WHERE m.plan_id = p.id AND m.user_id = u.id AND m.left_on IS NULL)
       ORDER BY p.name COLLATE NOCASE`,
    )
    .bind(userCode)
    .all<OpenPlanRow>();
  return results;
}

export async function hasPendingJoinRequest(db: D1Database, planId: number, userId: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS found FROM join_requests WHERE plan_id = ? AND user_id = ? AND status = 'PENDING'")
    .bind(planId, userId)
    .first();
  return row !== null;
}

// A second PENDING request for the same plan and member violates join_requests_one_pending
// -> DUPLICATE_DATA, so a double tap cannot create two.
export async function insertJoinRequest(
  db: D1Database,
  request: { code: string; plan_id: number; user_id: number; note: string | null },
): Promise<JoinRequestRow> {
  const [, selected] = await db.batch<JoinRequestRow>([
    db
      .prepare("INSERT INTO join_requests (code, plan_id, user_id, note) VALUES (?, ?, ?, ?)")
      .bind(request.code, request.plan_id, request.user_id, request.note),
    db.prepare(`${SELECT_REQUEST} WHERE r.code = ?`).bind(request.code),
  ]);
  return selected.results[0];
}

// Member withdraws their own pending request. null = it was no longer PENDING.
export async function cancelJoinRequest(db: D1Database, id: number, userId: number): Promise<JoinRequestRow | null> {
  const [updated, selected] = await db.batch<JoinRequestRow>([
    db
      .prepare(`UPDATE join_requests SET status = 'CANCELLED', decided_at = ${NOW} WHERE id = ? AND user_id = ? AND status = 'PENDING'`)
      .bind(id, userId),
    db.prepare(`${SELECT_REQUEST} WHERE r.id = ?`).bind(id),
  ]);
  return updated.meta.changes === 1 ? selected.results[0] : null;
}

export async function rejectJoinRequest(db: D1Database, id: number, adminCode: string): Promise<JoinRequestRow | null> {
  const [updated, selected] = await db.batch<JoinRequestRow>([
    db
      .prepare(
        `UPDATE join_requests SET status = 'REJECTED', decided_at = ${NOW}, decided_by = (SELECT id FROM users WHERE code = ?)
         WHERE id = ? AND status = 'PENDING'`,
      )
      .bind(adminCode, id),
    db.prepare(`${SELECT_REQUEST} WHERE r.id = ?`).bind(id),
  ]);
  return updated.meta.changes === 1 ? selected.results[0] : null;
}

export type ApproveOutcome = { row: JoinRequestRow; approved: boolean };

// Creates the seat and marks the request APPROVED in one transaction. The seat is inserted only
// while the request is still PENDING, the plan active and a seat free — all checked inside the
// INSERT, so a concurrent approval or cancellation cannot slip between check and write. The
// UPDATE then happens only if that seat now exists. approved = false: nothing changed; the caller
// reads the returned row to say why. A second active seat for the same member violates
// plan_members_active_unique -> DUPLICATE_DATA and rolls the whole batch back.
export async function approveJoinRequest(
  db: D1Database,
  approval: { id: number; memberCode: string; joinedOn: string; adminCode: string },
): Promise<ApproveOutcome> {
  const { id, memberCode, joinedOn, adminCode } = approval;
  const [, updated, selected] = await db.batch<JoinRequestRow>([
    db
      .prepare(
        `INSERT INTO plan_members (code, plan_id, user_id, joined_on)
         SELECT ?, r.plan_id, r.user_id, ?
         FROM join_requests r JOIN plans p ON p.id = r.plan_id
         WHERE r.id = ? AND r.status = 'PENDING' AND p.active = 1
           AND (SELECT COUNT(*) FROM plan_members m WHERE m.plan_id = p.id AND m.left_on IS NULL) < p.max_slots`,
      )
      .bind(memberCode, joinedOn, id),
    db
      .prepare(
        `UPDATE join_requests
         SET status = 'APPROVED', decided_at = ${NOW},
             decided_by = (SELECT id FROM users WHERE code = ?),
             member_id = (SELECT id FROM plan_members WHERE code = ?)
         WHERE id = ? AND status = 'PENDING' AND EXISTS (SELECT 1 FROM plan_members WHERE code = ?)`,
      )
      .bind(adminCode, memberCode, id, memberCode),
    db.prepare(`${SELECT_REQUEST} WHERE r.id = ?`).bind(id),
  ]);
  return { row: selected.results[0], approved: updated.meta.changes === 1 };
}
