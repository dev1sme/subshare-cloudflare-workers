import { Hono } from "hono";
import type { PaymentStatus, Prepayment } from "../../shared/types";
import { requireAdmin, type AppEnv } from "../auth";
import {
  type PrepaymentRow,
  confirmPrepayment,
  deletePrepayment,
  findPrepaymentByCode,
  listPrepayments,
  revertPrepayment,
} from "../db/prepayments";
import { Where } from "../db/sql";
import { CODE_PREFIX } from "../domain/code";
import { failure, notFound, ok } from "../envelope";
import { fail, parseCode, readBody, requireEnum } from "../validate";
import { PAYMENT_STATUSES } from "./payments";

// Admin: every prepayment, confirm / revert, and delete an unconfirmed one. Spec: docs/data-model.md#trả-trước.
export const prepaymentRoutes = new Hono<AppEnv>();

prepaymentRoutes.use(requireAdmin);

const LIST_LIMIT = 500;

export function toPrepayment(row: PrepaymentRow): Prepayment {
  return {
    code: row.code,
    plan: { code: row.plan_code, name: row.plan_name, provider: row.plan_provider },
    user: { code: row.user_code, username: row.username, display_name: row.display_name },
    start_period: row.start_period,
    end_period: row.end_period,
    months: row.months,
    amount_per_month: row.amount_per_month,
    amount: row.amount,
    status: row.status,
    created_at: row.created_at,
    marked_at: row.marked_at,
    confirmed_at: row.confirmed_at,
  };
}

prepaymentRoutes.get("/", async (c) => {
  const status = c.req.query("status");
  if (status !== undefined && !PAYMENT_STATUSES.includes(status as PaymentStatus)) fail("INVALID_STATUS");
  const rows = await listPrepayments(c.env.DB, new Where().add("pp.status = ?", status), LIST_LIMIT);
  return ok(c, { prepayments: rows.map(toPrepayment) });
});

// PAID also settles the member's existing payments of the covered months; UNPAID undoes all of it.
prepaymentRoutes.patch("/:code", async (c) => {
  const prepayment = await findPrepaymentByCode(c.env.DB, parseCode(CODE_PREFIX.prepayment, c.req.param("code")));
  if (!prepayment) return notFound(c);

  const body = await readBody(c);
  const to = requireEnum(body, "status", ["PAID", "UNPAID"] as const);
  const applied =
    to === "PAID"
      ? await confirmPrepayment(c.env.DB, prepayment, c.get("session").code)
      : await revertPrepayment(c.env.DB, prepayment.id);
  if (!applied) {
    return failure(c, "INVALID_STATUS_TRANSITION", `A ${prepayment.status} prepayment cannot become ${to}.`, 409);
  }
  const updated = await findPrepaymentByCode(c.env.DB, prepayment.code);
  return ok(c, { prepayment: toPrepayment(updated!) }, "Prepayment updated.");
});

// An UNPAID or PENDING prepayment can be dropped; a PAID one must be reverted first.
prepaymentRoutes.delete("/:code", async (c) => {
  const prepayment = await findPrepaymentByCode(c.env.DB, parseCode(CODE_PREFIX.prepayment, c.req.param("code")));
  if (!prepayment) return notFound(c);
  if (!(await deletePrepayment(c.env.DB, prepayment.id, ["UNPAID", "PENDING"]))) {
    return failure(c, "CANNOT_DELETE_PREPAYMENT", "A PAID prepayment must be reverted before it is deleted.", 409);
  }
  return ok(c, null, "Prepayment deleted.");
});
