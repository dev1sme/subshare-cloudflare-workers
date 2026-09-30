import type { Provider } from "../../shared/providers";
// prepayments: 3/6/12 months of one plan paid at once. Spec: docs/data-model.md#trả-trước.
import type { PaymentStatus } from "../../shared/types";
import type { Where } from "./sql";

export type PrepaymentRow = {
  id: number;
  code: string;
  plan_id: number;
  user_id: number;
  start_period: string;
  end_period: string;
  months: number;
  amount_per_month: number;
  amount: number;
  status: PaymentStatus;
  created_at: string;
  marked_at: string | null;
  confirmed_at: string | null;
  plan_code: string;
  plan_name: string;
  plan_provider: Provider;
  bank_bin: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  user_code: string;
  username: string;
  display_name: string;
};

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

const SELECT_PREPAYMENT = `
  SELECT pp.id, pp.code, pp.plan_id, pp.user_id, pp.start_period, pp.end_period, pp.months,
         pp.amount_per_month, pp.amount, pp.status, pp.created_at, pp.marked_at, pp.confirmed_at,
         p.code AS plan_code, p.name AS plan_name, p.provider AS plan_provider, p.bank_bin, p.bank_account_no, p.bank_account_name,
         u.code AS user_code, u.username, u.display_name
  FROM prepayments pp
  JOIN plans p ON p.id = pp.plan_id
  JOIN users u ON u.id = pp.user_id`;

export async function listPrepaymentsOfUser(db: D1Database, userCode: string): Promise<PrepaymentRow[]> {
  const { results } = await db
    .prepare(`${SELECT_PREPAYMENT} WHERE pp.user_id = (SELECT id FROM users WHERE code = ?) ORDER BY pp.start_period DESC`)
    .bind(userCode)
    .all<PrepaymentRow>();
  return results;
}

export async function listPrepayments(db: D1Database, where: Where, limit: number): Promise<PrepaymentRow[]> {
  const { results } = await db
    .prepare(`${SELECT_PREPAYMENT}${where.clause()} ORDER BY pp.created_at DESC LIMIT ?`)
    .bind(...where.bindings(), limit)
    .all<PrepaymentRow>();
  return results;
}

export function findPrepaymentByCode(db: D1Database, code: string): Promise<PrepaymentRow | null> {
  return db.prepare(`${SELECT_PREPAYMENT} WHERE pp.code = ?`).bind(code).first<PrepaymentRow>();
}

// From `fromPeriod` on: months the member already settled (a PENDING or PAID payment) and the
// ranges their prepayments already cover, in one round trip.
export async function coverageFrom(
  db: D1Database,
  planId: number,
  userId: number,
  fromPeriod: string,
): Promise<{ settled: Set<string>; ranges: { start_period: string; end_period: string }[] }> {
  const [settled, ranges] = await db.batch([
    db
      .prepare(
        `SELECT bp.period FROM payments pm JOIN billing_periods bp ON bp.id = pm.billing_period_id
         WHERE pm.user_id = ? AND bp.plan_id = ? AND bp.period >= ? AND pm.status IN ('PENDING', 'PAID')`,
      )
      .bind(userId, planId, fromPeriod),
    db
      .prepare("SELECT start_period, end_period FROM prepayments WHERE plan_id = ? AND user_id = ? AND end_period >= ?")
      .bind(planId, userId, fromPeriod),
  ]);
  return {
    settled: new Set((settled.results as { period: string }[]).map((row) => row.period)),
    ranges: ranges.results as { start_period: string; end_period: string }[],
  };
}

export async function insertPrepayment(
  db: D1Database,
  row: Pick<PrepaymentRow, "code" | "plan_id" | "user_id" | "start_period" | "end_period" | "months" | "amount_per_month">,
): Promise<PrepaymentRow> {
  const [, selected] = await db.batch<PrepaymentRow>([
    db
      .prepare(
        `INSERT INTO prepayments (code, plan_id, user_id, start_period, end_period, months, amount_per_month, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(row.code, row.plan_id, row.user_id, row.start_period, row.end_period, row.months, row.amount_per_month, row.months * row.amount_per_month),
    db.prepare(`${SELECT_PREPAYMENT} WHERE pp.code = ?`).bind(row.code),
  ]);
  return selected.results[0];
}

// UNPAID -> PENDING, only by its own member.
export async function markPrepaymentSent(db: D1Database, id: number, userCode: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE prepayments SET status = 'PENDING', marked_at = ${NOW}
       WHERE id = ? AND status = 'UNPAID' AND user_id = (SELECT id FROM users WHERE code = ?)`,
    )
    .bind(id, userCode)
    .run();
  return result.meta.changes > 0;
}

/**
 * Admin: UNPAID/PENDING -> PAID. In the same transaction, the member's existing payments of the
 * covered months that are not PAID yet become PAID at the prepaid amount and point at it. Months
 * whose period does not exist yet are covered when createPeriod makes them.
 */
export async function confirmPrepayment(db: D1Database, prepayment: PrepaymentRow, adminCode: string): Promise<boolean> {
  const [confirmed] = await db.batch([
    db
      .prepare(
        `UPDATE prepayments SET status = 'PAID', confirmed_at = ${NOW}, confirmed_by = (SELECT id FROM users WHERE code = ?)
         WHERE id = ? AND status IN ('UNPAID', 'PENDING')`,
      )
      .bind(adminCode, prepayment.id),
    db
      .prepare(
        `UPDATE payments
         SET status = 'PAID', amount = ?, prepayment_id = ?,
             confirmed_at = (SELECT confirmed_at FROM prepayments WHERE id = ?),
             confirmed_by = (SELECT confirmed_by FROM prepayments WHERE id = ?)
         WHERE user_id = ? AND status IN ('UNPAID', 'PENDING') AND prepayment_id IS NULL
           AND billing_period_id IN (SELECT id FROM billing_periods WHERE plan_id = ? AND period BETWEEN ? AND ?)
           AND EXISTS (SELECT 1 FROM prepayments WHERE id = ? AND status = 'PAID')`,
      )
      .bind(
        prepayment.amount_per_month,
        prepayment.id,
        prepayment.id,
        prepayment.id,
        prepayment.user_id,
        prepayment.plan_id,
        prepayment.start_period,
        prepayment.end_period,
        prepayment.id,
      ),
  ]);
  return confirmed.meta.changes > 0;
}

// Admin: PENDING/PAID -> UNPAID. Every payment it settled goes back to UNPAID with it.
export async function revertPrepayment(db: D1Database, id: number): Promise<boolean> {
  const [, reverted] = await db.batch([
    db
      .prepare(
        `UPDATE payments SET status = 'UNPAID', marked_at = NULL, confirmed_at = NULL, confirmed_by = NULL, prepayment_id = NULL
         WHERE prepayment_id = ?`,
      )
      .bind(id),
    db
      .prepare(
        `UPDATE prepayments SET status = 'UNPAID', marked_at = NULL, confirmed_at = NULL, confirmed_by = NULL
         WHERE id = ? AND status IN ('PENDING', 'PAID')`,
      )
      .bind(id),
  ]);
  return reverted.meta.changes > 0;
}

// Only while nothing hangs on it: never a PAID one (revert it first).
export async function deletePrepayment(db: D1Database, id: number, allowed: readonly PaymentStatus[]): Promise<boolean> {
  const placeholders = allowed.map(() => "?").join(", ");
  const result = await db
    .prepare(`DELETE FROM prepayments WHERE id = ? AND status IN (${placeholders}) AND status <> 'PAID'`)
    .bind(id, ...allowed)
    .run();
  return result.meta.changes > 0;
}
