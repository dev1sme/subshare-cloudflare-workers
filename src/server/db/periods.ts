// billing_periods and the payments created with them. Spec: docs/data-model.md.
import { CODE_PREFIX, generateCode } from "../domain/code";
import { firstDayOf } from "../domain/period";

export type PeriodRow = {
  id: number;
  code: string;
  plan_id: number;
  period: string;
  price: number;
  created_at: string;
  payment_count: number;
  paid_count: number;
  amount_total: number;
  amount_paid: number;
};

// payments(billing_period_id, user_id) is UNIQUE, so the join walks that index.
const SELECT_PERIOD = `
  SELECT bp.id, bp.code, bp.plan_id, bp.period, bp.price, bp.created_at,
         COUNT(pm.id) AS payment_count,
         COALESCE(SUM(pm.status = 'PAID'), 0) AS paid_count,
         COALESCE(SUM(pm.amount), 0) AS amount_total,
         COALESCE(SUM(CASE WHEN pm.status = 'PAID' THEN pm.amount END), 0) AS amount_paid
  FROM billing_periods bp
  LEFT JOIN payments pm ON pm.billing_period_id = bp.id`;

// Newest first; served by UNIQUE(plan_id, period).
export async function listPeriodsOfPlan(db: D1Database, planId: number): Promise<PeriodRow[]> {
  const { results } = await db
    .prepare(`${SELECT_PERIOD} WHERE bp.plan_id = ? GROUP BY bp.id ORDER BY bp.period DESC`)
    .bind(planId)
    .all<PeriodRow>();
  return results;
}

// Seats present on the period's first day: joined on or before it, not left before it.
async function billableUserIds(db: D1Database, planId: number, period: string): Promise<number[]> {
  const firstDay = firstDayOf(period);
  const { results } = await db
    .prepare(
      `SELECT user_id FROM plan_members
       WHERE plan_id = ? AND joined_on <= ? AND (left_on IS NULL OR left_on >= ?)
       ORDER BY id`,
    )
    .bind(planId, firstDay, firstDay)
    .all<{ user_id: number }>();
  return results.map((row) => row.user_id);
}

/**
 * Creates the period and one payment per billable seat — or does nothing if the period exists.
 *
 * Idempotent (a cron retry or a double click is a no-op): the period INSERT is ON CONFLICT DO
 * NOTHING, and every payment INSERT selects the period by the code generated for *this* call,
 * so when the period already existed they match no row. The batch is one transaction, and the
 * amounts are read from plans.member_amount inside it — the snapshot.
 *
 * A month covered by the member's PAID prepayment is created already PAID, at the prepaid
 * monthly amount, and linked to that prepayment. Coverage never overlaps (checked when a
 * prepayment is created), so the LEFT JOIN yields at most one row per seat.
 */
export async function createPeriod(
  db: D1Database,
  planId: number,
  period: string,
): Promise<{ row: PeriodRow; created: boolean }> {
  const userIds = await billableUserIds(db, planId, period);
  const periodCode = generateCode(CODE_PREFIX.period);

  const results = await db.batch([
    db
      .prepare(
        `INSERT INTO billing_periods (code, plan_id, period, price)
         SELECT ?, id, ?, price FROM plans WHERE id = ?
         ON CONFLICT (plan_id, period) DO NOTHING`,
      )
      .bind(periodCode, period, planId),
    ...userIds.map((userId) =>
      db
        .prepare(
          `INSERT INTO payments (code, billing_period_id, user_id, amount, status, confirmed_at, confirmed_by, prepayment_id)
           SELECT ?, bp.id, ?,
                  COALESCE(pp.amount_per_month, p.member_amount),
                  CASE WHEN pp.id IS NULL THEN 'UNPAID' ELSE 'PAID' END,
                  pp.confirmed_at, pp.confirmed_by, pp.id
           FROM billing_periods bp
           JOIN plans p ON p.id = bp.plan_id
           LEFT JOIN prepayments pp
             ON pp.plan_id = bp.plan_id AND pp.user_id = ? AND pp.status = 'PAID'
            AND bp.period BETWEEN pp.start_period AND pp.end_period
           WHERE bp.code = ?`,
        )
        .bind(generateCode(CODE_PREFIX.payment), userId, userId, periodCode),
    ),
    db.prepare(`${SELECT_PERIOD} WHERE bp.plan_id = ? AND bp.period = ? GROUP BY bp.id`).bind(planId, period),
  ]);

  const selected = results[results.length - 1] as D1Result<PeriodRow>;
  return { row: selected.results[0], created: results[0].meta.changes === 1 };
}
