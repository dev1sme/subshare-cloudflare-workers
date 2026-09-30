import { Hono } from "hono";
import type { PaymentStatus, Prepayment } from "../../shared/types";
import { requireAdmin, type AppEnv } from "../auth";
import { findMemberByCode } from "../db/members";
import {
  type PrepaymentRow,
  confirmPrepayment,
  coverageFrom,
  deletePrepayment,
  findPrepaymentByCode,
  listPrepayments,
  recordPaidPrepayment,
  revertPrepayment,
} from "../db/prepayments";
import { Where } from "../db/sql";
import { CODE_PREFIX, generateCode, isCode } from "../domain/code";
import { addMonths, isPeriod } from "../domain/period";
import { failure, notFound, ok } from "../envelope";
import { type Body, fail, parseCode, readBody, requireEnum } from "../validate";
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

// ?status= for the review queue, ?plan_code= for one plan's members.
prepaymentRoutes.get("/", async (c) => {
  const status = c.req.query("status");
  const planCode = c.req.query("plan_code");
  if (status !== undefined && !PAYMENT_STATUSES.includes(status as PaymentStatus)) fail("INVALID_STATUS");
  if (planCode !== undefined && !isCode(CODE_PREFIX.plan, planCode)) fail("INVALID_PLAN_CODE");
  const where = new Where().add("pp.status = ?", status).add("p.code = ?", planCode);
  const rows = await listPrepayments(c.env.DB, where, LIST_LIMIT);
  return ok(c, { prepayments: rows.map(toPrepayment) });
});

// Longest range an admin can record at once (the table allows 1-24).
const RECORD_MAX_MONTHS = 24;

function requirePeriod(body: Body, field: "from_period" | "to_period"): string {
  const value = body[field];
  if (value === undefined || value === null || value === "") fail(field === "from_period" ? "MISSING_FROM_PERIOD" : "MISSING_TO_PERIOD");
  if (typeof value !== "string" || !isPeriod(value)) fail(field === "from_period" ? "INVALID_FROM_PERIOD" : "INVALID_TO_PERIOD");
  return value;
}

// The months a seat is billed for: a period bills every seat present on its 1st (docs/data-model.md).
function billedMonths(joinedOn: string, leftOn: string | null): { first: string; last: string | null } {
  const joinedMonth = joinedOn.slice(0, 7);
  return { first: joinedOn.endsWith("-01") ? joinedMonth : addMonths(joinedMonth, 1), last: leftOn ? leftOn.slice(0, 7) : null };
}

// A member paid outside the app (cash, one transfer for several months): the admin records the
// months as a prepayment that is PAID at once. Past months are allowed; nothing in the range may be
// settled, reported or covered already. Spec: docs/payments.md#trả-trước.
prepaymentRoutes.post("/", async (c) => {
  const body = await readBody(c);
  const memberCode = body.member_code;
  if (memberCode === undefined || memberCode === null || memberCode === "") fail("MISSING_MEMBER_CODE");
  if (typeof memberCode !== "string" || !isCode(CODE_PREFIX.member, memberCode)) fail("INVALID_MEMBER_CODE");
  const from = requirePeriod(body, "from_period");
  const to = requirePeriod(body, "to_period");
  if (to < from) fail("INVALID_PERIOD_RANGE", "to_period is before from_period.");
  let months = 1;
  while (addMonths(from, months) <= to) months++;
  if (months > RECORD_MAX_MONTHS) fail("PREPAYMENT_TOO_LONG", `At most ${RECORD_MAX_MONTHS} months at once.`);

  const seat = await findMemberByCode(c.env.DB, memberCode);
  if (!seat) return notFound(c);
  const billed = billedMonths(seat.joined_on, seat.left_on);
  if (from < billed.first || (billed.last !== null && to > billed.last)) {
    return failure(c, "PERIOD_OUTSIDE_SEAT", "The range starts before the seat was billed or ends after it left.", 409);
  }

  const { settled, ranges } = await coverageFrom(c.env.DB, seat.plan_id, seat.user_id, from);
  for (let period = from; period <= to; period = addMonths(period, 1)) {
    if (settled.has(period) || ranges.some((r) => r.start_period <= period && period <= r.end_period)) {
      return failure(c, "PREPAYMENT_OVERLAP", `${period} is already paid, reported or covered by a prepayment.`, 409);
    }
  }

  const row = await recordPaidPrepayment(
    c.env.DB,
    { code: generateCode(CODE_PREFIX.prepayment), plan_id: seat.plan_id, user_id: seat.user_id, start_period: from, end_period: to, months },
    c.get("session").code,
  );
  return ok(c, { prepayment: toPrepayment(row) }, "Payment recorded.", 201);
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
