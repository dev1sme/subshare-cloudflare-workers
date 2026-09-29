import { Hono } from "hono";
import type { Payment, PaymentStatus } from "../../shared/types";
import { requireAdmin, type AppEnv } from "../auth";
import { type PaymentRow, findPaymentByCode, listPayments, setPaymentStatus } from "../db/payments";
import { Where } from "../db/sql";
import { CODE_PREFIX, isCode } from "../domain/code";
import { isPeriod } from "../domain/period";
import { failure, notFound, ok } from "../envelope";
import { fail, parseCode, readBody, requireEnum } from "../validate";

// Admin: every payment, and the confirm / revert transitions. Spec: docs/payments.md.
export const paymentRoutes = new Hono<AppEnv>();

paymentRoutes.use(requireAdmin);

export const PAYMENT_STATUSES: readonly PaymentStatus[] = ["UNPAID", "PENDING", "PAID"];
const LIST_LIMIT = 500;

export function toPayment(row: PaymentRow): Payment {
  return {
    code: row.code,
    plan: { code: row.plan_code, name: row.plan_name },
    user: { code: row.user_code, username: row.username, display_name: row.display_name },
    period: row.period,
    amount: row.amount,
    status: row.status,
    marked_at: row.marked_at,
    confirmed_at: row.confirmed_at,
    prepayment_code: row.prepayment_code,
  };
}

// ?status=PENDING is the "waiting for me" list; ?period=YYYY-MM and ?plan_code=PL... narrow it.
paymentRoutes.get("/", async (c) => {
  const status = c.req.query("status");
  const period = c.req.query("period");
  const planCode = c.req.query("plan_code");
  if (status !== undefined && !PAYMENT_STATUSES.includes(status as PaymentStatus)) fail("INVALID_STATUS");
  if (period !== undefined && !isPeriod(period)) fail("INVALID_PERIOD");
  if (planCode !== undefined && !isCode(CODE_PREFIX.plan, planCode)) fail("INVALID_PLAN_CODE");

  const where = new Where().add("pm.status = ?", status).add("bp.period = ?", period).add("p.code = ?", planCode);
  const rows = await listPayments(c.env.DB, where, LIST_LIMIT);
  return ok(c, { payments: rows.map(toPayment) });
});

// { status: "PAID" } confirms after checking the bank statement; { status: "UNPAID" } sends it back.
paymentRoutes.patch("/:code", async (c) => {
  const payment = await findPaymentByCode(c.env.DB, parseCode(CODE_PREFIX.payment, c.req.param("code")));
  if (!payment) return notFound(c);

  const body = await readBody(c);
  const to = requireEnum(body, "status", ["PAID", "UNPAID"] as const);
  if (payment.prepayment_id !== null) {
    return failure(c, "PAYMENT_COVERED_BY_PREPAYMENT", "This payment moves with its prepayment.", 409);
  }
  if (!(await setPaymentStatus(c.env.DB, payment.id, to, c.get("session").code))) {
    return failure(c, "INVALID_STATUS_TRANSITION", `A ${payment.status} payment cannot become ${to}.`, 409);
  }
  const updated = await findPaymentByCode(c.env.DB, payment.code);
  return ok(c, { payment: toPayment(updated!) }, "Payment updated.");
});
