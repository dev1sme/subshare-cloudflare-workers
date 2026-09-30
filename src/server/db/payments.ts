import type { Provider } from "../../shared/providers";
// payments: one member's share of one period. Status transitions are guarded inside each UPDATE
// (WHERE status IN ...), so two admins clicking at once cannot both apply. Spec: docs/payments.md.
import type { PaymentStatus } from "../../shared/types";
import type { Where } from "./sql";

export type PaymentRow = {
  id: number;
  code: string;
  user_id: number;
  amount: number;
  status: PaymentStatus;
  marked_at: string | null;
  confirmed_at: string | null;
  prepayment_id: number | null;
  period: string;
  plan_code: string;
  plan_name: string;
  plan_provider: Provider;
  bank_bin: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
  user_code: string;
  username: string;
  display_name: string;
  prepayment_code: string | null;
};

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

const SELECT_PAYMENT = `
  SELECT pm.id, pm.code, pm.user_id, pm.amount, pm.status, pm.marked_at, pm.confirmed_at, pm.prepayment_id,
         bp.period, p.code AS plan_code, p.name AS plan_name, p.provider AS plan_provider,
         p.bank_bin, p.bank_account_no, p.bank_account_name,
         u.code AS user_code, u.username, u.display_name,
         pp.code AS prepayment_code
  FROM payments pm
  JOIN billing_periods bp ON bp.id = pm.billing_period_id
  JOIN plans p ON p.id = bp.plan_id
  JOIN users u ON u.id = pm.user_id
  LEFT JOIN prepayments pp ON pp.id = pm.prepayment_id`;

// A member's own payments: what is still owed first, then newest.
export async function listPaymentsOfUser(db: D1Database, userCode: string): Promise<PaymentRow[]> {
  const { results } = await db
    .prepare(`${SELECT_PAYMENT} WHERE pm.user_id = (SELECT id FROM users WHERE code = ?) ORDER BY pm.status = 'PAID', bp.period DESC, p.name COLLATE NOCASE`)
    .bind(userCode)
    .all<PaymentRow>();
  return results;
}

// Admin list. Filters come from a Where built with fixed conditions at the call site.
export async function listPayments(db: D1Database, where: Where, limit: number): Promise<PaymentRow[]> {
  const { results } = await db
    .prepare(`${SELECT_PAYMENT}${where.clause()} ORDER BY bp.period DESC, p.name COLLATE NOCASE, u.username LIMIT ?`)
    .bind(...where.bindings(), limit)
    .all<PaymentRow>();
  return results;
}

export function findPaymentByCode(db: D1Database, code: string): Promise<PaymentRow | null> {
  return db.prepare(`${SELECT_PAYMENT} WHERE pm.code = ?`).bind(code).first<PaymentRow>();
}

// UNPAID -> PENDING, only by the payment's own member. false = not UNPAID any more.
export async function markPaymentSent(db: D1Database, id: number, userCode: string): Promise<boolean> {
  const result = await db
    .prepare(
      `UPDATE payments SET status = 'PENDING', marked_at = ${NOW}
       WHERE id = ? AND status = 'UNPAID' AND user_id = (SELECT id FROM users WHERE code = ?)`,
    )
    .bind(id, userCode)
    .run();
  return result.meta.changes > 0;
}

// Admin: UNPAID/PENDING -> PAID, or PENDING/PAID -> UNPAID. Never on a payment a prepayment
// settled — that one moves with its prepayment. false = the transition does not apply.
export async function setPaymentStatus(db: D1Database, id: number, to: "PAID" | "UNPAID", adminCode: string): Promise<boolean> {
  const statement =
    to === "PAID"
      ? db
          .prepare(
            `UPDATE payments SET status = 'PAID', confirmed_at = ${NOW}, confirmed_by = (SELECT id FROM users WHERE code = ?)
             WHERE id = ? AND status IN ('UNPAID', 'PENDING') AND prepayment_id IS NULL`,
          )
          .bind(adminCode, id)
      : db
          .prepare(
            `UPDATE payments SET status = 'UNPAID', marked_at = NULL, confirmed_at = NULL, confirmed_by = NULL
             WHERE id = ? AND status IN ('PENDING', 'PAID') AND prepayment_id IS NULL`,
          )
          .bind(id);
  const result = await statement.run();
  return result.meta.changes > 0;
}

