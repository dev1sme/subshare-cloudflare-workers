import type { Cycle } from "../../shared/types";
import { buildSet } from "./sql";

export type PlanRow = {
  id: number;
  code: string;
  name: string;
  price: number;
  cycle: Cycle;
  max_slots: number;
  payer_id: number;
  bank_bin: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  active: number;
  created_at: string;
  payer_code: string;
  payer_display_name: string;
  active_members: number;
};

// Columns an admin may set through POST / PATCH /api/plans.
export type PlanFields = {
  name: string;
  price: number;
  cycle: Cycle;
  max_slots: number;
  payer_id: number;
  bank_bin: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  active: number;
};

// The active-seat count is served by the partial index plan_members_active_unique (plan_id, ... WHERE left_on IS NULL).
const SELECT_PLAN = `
  SELECT p.id, p.code, p.name, p.price, p.cycle, p.max_slots, p.payer_id,
         p.bank_bin, p.bank_account_no, p.bank_account_name, p.active, p.created_at,
         u.code AS payer_code, u.display_name AS payer_display_name,
         (SELECT COUNT(*) FROM plan_members m WHERE m.plan_id = p.id AND m.left_on IS NULL) AS active_members
  FROM plans p
  JOIN users u ON u.id = p.payer_id`;

export async function listPlans(db: D1Database): Promise<PlanRow[]> {
  const { results } = await db.prepare(`${SELECT_PLAN} ORDER BY p.active DESC, p.name`).all<PlanRow>();
  return results;
}

export function findPlanByCode(db: D1Database, code: string): Promise<PlanRow | null> {
  return db.prepare(`${SELECT_PLAN} WHERE p.code = ?`).bind(code).first<PlanRow>();
}

export async function insertPlan(db: D1Database, code: string, fields: PlanFields): Promise<PlanRow> {
  // One round trip: the batch runs in order inside one transaction, so the SELECT sees the INSERT.
  const [, selected] = await db.batch<PlanRow>([
    db
      .prepare(
        `INSERT INTO plans (code, name, price, cycle, max_slots, payer_id, bank_bin, bank_account_no, bank_account_name, active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        code,
        fields.name,
        fields.price,
        fields.cycle,
        fields.max_slots,
        fields.payer_id,
        fields.bank_bin,
        fields.bank_account_no,
        fields.bank_account_name,
        fields.active,
      ),
    db.prepare(`${SELECT_PLAN} WHERE p.code = ?`).bind(code),
  ]);
  return selected.results[0];
}

export async function updatePlan(db: D1Database, id: number, patch: Partial<PlanFields>): Promise<PlanRow> {
  const set = buildSet(patch);
  if (!set) throw new Error("updatePlan: empty patch");
  const [, selected] = await db.batch<PlanRow>([
    db.prepare(`UPDATE plans SET ${set.clause} WHERE id = ?`).bind(...set.values, id),
    db.prepare(`${SELECT_PLAN} WHERE p.id = ?`).bind(id),
  ]);
  return selected.results[0];
}

// Seats and periods keep a plan through the FKs -> RELATED_DATA_EXISTS.
export async function deletePlan(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM plans WHERE id = ?").bind(id).run();
}

// A plan's payer must stay an ADMIN, so demoting one is refused while they pay for any plan.
export async function isPayerOfAnyPlan(db: D1Database, userId: number): Promise<boolean> {
  const row = await db.prepare("SELECT 1 AS found FROM plans WHERE payer_id = ? LIMIT 1").bind(userId).first();
  return row !== null;
}

// The payer has no seat in their own plan.
export async function hasActiveSeat(db: D1Database, planId: number, userId: number): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS found FROM plan_members WHERE plan_id = ? AND user_id = ? AND left_on IS NULL")
    .bind(planId, userId)
    .first();
  return row !== null;
}
