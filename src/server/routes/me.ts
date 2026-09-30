import { Hono } from "hono";
import { PROVIDERS } from "../../shared/providers";
import { type MyPlan, type MyWish, type OpenPlan, PREPAY_MONTHS } from "../../shared/types";
import { requireMember, type AppEnv } from "../auth";
import {
  cancelJoinRequest,
  findAskContext,
  findJoinRequestByCode,
  insertJoinRequest,
  listJoinRequestsOfUser,
  listOpenPlansForUser,
} from "../db/joinRequests";
import { listSeatsOfUser } from "../db/members";
import { type MyWishRow, closeWish, findMyWish, insertWish, listWishesOfUser, markWishSeen } from "../db/wishes";
import { findPaymentByCode, listPaymentsOfUser, markPaymentSent } from "../db/payments";
import {
  coverageFrom,
  deletePrepayment,
  findPrepaymentByCode,
  insertPrepayment,
  listPrepaymentsOfUser,
  markPrepaymentSent,
} from "../db/prepayments";
import { CODE_PREFIX, generateCode, isCode } from "../domain/code";
import { addMonths, currentPeriodInVietnam } from "../domain/period";
import { bankTransferFor } from "../domain/vietqr";
import { failure, isUniqueViolation, notFound, ok } from "../envelope";
import { fail, optionalString, parseCode, readBody, requireEnum, requireString } from "../validate";
import { toJoinRequest } from "./joinRequests";
import { toPayment } from "./payments";
import { toPrepayment } from "./prepayments";

// The signed-in member's own money. The user always comes from the token, never the request, and
// another member's payment is 404 — not 403, so codes cannot be probed. Spec: docs/auth.md.
export const meRoutes = new Hono<AppEnv>();

meRoutes.use(requireMember);

// How far ahead the first uncovered month is searched for.
const PREPAY_HORIZON = 36;

meRoutes.get("/plans", async (c) => {
  const seats = await listSeatsOfUser(c.env.DB, c.get("session").code);
  const plans: MyPlan[] = seats.map((s) => ({ code: s.plan_code, name: s.plan_name, provider: s.plan_provider, member_amount: s.member_amount }));
  return ok(c, { plans });
});

meRoutes.get("/payments", async (c) => {
  const rows = await listPaymentsOfUser(c.env.DB, c.get("session").code);
  return ok(c, { payments: rows.map(toPayment) });
});

meRoutes.get("/payments/:code", async (c) => {
  const row = await findPaymentByCode(c.env.DB, parseCode(CODE_PREFIX.payment, c.req.param("code")));
  if (!row || row.user_code !== c.get("session").code) return notFound(c);
  return ok(c, { payment: toPayment(row), bank_transfer: bankTransferFor(row, row.amount, row.code, row.status) });
});

// "I have transferred": UNPAID -> PENDING. Only an admin sets PAID, after checking the statement.
meRoutes.post("/payments/:code/mark-sent", async (c) => {
  const row = await findPaymentByCode(c.env.DB, parseCode(CODE_PREFIX.payment, c.req.param("code")));
  if (!row || row.user_code !== c.get("session").code) return notFound(c);
  if (!(await markPaymentSent(c.env.DB, row.id, row.user_code))) {
    return failure(c, "INVALID_STATUS_TRANSITION", `A ${row.status} payment cannot be marked as sent.`, 409);
  }
  const updated = await findPaymentByCode(c.env.DB, row.code);
  return ok(c, { payment: toPayment(updated!) }, "Marked as sent.");
});

meRoutes.get("/prepayments", async (c) => {
  const rows = await listPrepaymentsOfUser(c.env.DB, c.get("session").code);
  return ok(c, { prepayments: rows.map(toPrepayment) });
});

meRoutes.get("/prepayments/:code", async (c) => {
  const row = await findPrepaymentByCode(c.env.DB, parseCode(CODE_PREFIX.prepayment, c.req.param("code")));
  if (!row || row.user_code !== c.get("session").code) return notFound(c);
  return ok(c, { prepayment: toPrepayment(row), bank_transfer: bankTransferFor(row, row.amount, row.code, row.status) });
});

// Pay 3, 6 or 12 months of a plan at once, no discount. The range starts at the first month from
// now that is neither settled nor covered by another prepayment, and may not overlap either.
meRoutes.post("/prepayments", async (c) => {
  const body = await readBody(c);
  const planCode = body.plan_code;
  if (planCode === undefined || planCode === null || planCode === "") fail("MISSING_PLAN_CODE");
  if (typeof planCode !== "string" || !isCode(CODE_PREFIX.plan, planCode)) fail("INVALID_PLAN_CODE");
  const months = body.months;
  if (months === undefined || months === null) fail("MISSING_MONTHS");
  if (!PREPAY_MONTHS.includes(months as (typeof PREPAY_MONTHS)[number])) fail("INVALID_MONTHS");
  const monthCount = months as number;

  const session = c.get("session");
  const seat = (await listSeatsOfUser(c.env.DB, session.code)).find((s) => s.plan_code === planCode);
  // Not holding a seat looks the same as a plan that does not exist.
  if (!seat) return notFound(c);

  const current = currentPeriodInVietnam();
  const { settled, ranges } = await coverageFrom(c.env.DB, seat.plan_id, seat.user_id, current);
  const covered = (period: string) =>
    settled.has(period) || ranges.some((r) => r.start_period <= period && period <= r.end_period);

  let start = current;
  for (let i = 0; i < PREPAY_HORIZON && covered(start); i++) start = addMonths(start, 1);
  const end = addMonths(start, monthCount - 1);
  for (let period = start; period <= end; period = addMonths(period, 1)) {
    if (covered(period)) {
      return failure(c, "PREPAYMENT_OVERLAP", `${period} is already paid or covered by another prepayment.`, 409);
    }
  }

  const row = await insertPrepayment(c.env.DB, {
    code: generateCode(CODE_PREFIX.prepayment),
    plan_id: seat.plan_id,
    user_id: seat.user_id,
    start_period: start,
    end_period: end,
    months: monthCount,
    amount_per_month: seat.member_amount,
  });
  return ok(
    c,
    { prepayment: toPrepayment(row), bank_transfer: bankTransferFor(row, row.amount, row.code, row.status) },
    "Prepayment created.",
    201,
  );
});

meRoutes.post("/prepayments/:code/mark-sent", async (c) => {
  const row = await findPrepaymentByCode(c.env.DB, parseCode(CODE_PREFIX.prepayment, c.req.param("code")));
  if (!row || row.user_code !== c.get("session").code) return notFound(c);
  if (!(await markPrepaymentSent(c.env.DB, row.id, row.user_code))) {
    return failure(c, "INVALID_STATUS_TRANSITION", `A ${row.status} prepayment cannot be marked as sent.`, 409);
  }
  const updated = await findPrepaymentByCode(c.env.DB, row.code);
  return ok(c, { prepayment: toPrepayment(updated!) }, "Marked as sent.");
});

// A member may drop their own prepayment only before reporting the transfer.
meRoutes.delete("/prepayments/:code", async (c) => {
  const row = await findPrepaymentByCode(c.env.DB, parseCode(CODE_PREFIX.prepayment, c.req.param("code")));
  if (!row || row.user_code !== c.get("session").code) return notFound(c);
  if (!(await deletePrepayment(c.env.DB, row.id, ["UNPAID"]))) {
    return failure(c, "CANNOT_DELETE_PREPAYMENT", "Only an unpaid prepayment you have not reported can be deleted.", 409);
  }
  return ok(c, null, "Prepayment deleted.");
});

const NOTE_MAX = 200;

// Plans the member may ask to join, each with their own pending request if any.
meRoutes.get("/open-plans", async (c) => {
  const rows = await listOpenPlansForUser(c.env.DB, c.get("session").code);
  const plans: OpenPlan[] = rows.map((row) => ({
    code: row.plan_code,
    name: row.plan_name,
    provider: row.plan_provider,
    member_amount: row.member_amount,
    cycle: row.cycle,
    max_slots: row.max_slots,
    active_members: row.active_members,
    pending_request_code: row.pending_request_code,
    pending_requests: row.pending_requests,
    priority_until: row.priority_until,
    priority_for_me: row.priority_for_me === 1,
  }));
  return ok(c, { plans });
});

meRoutes.get("/join-requests", async (c) => {
  const rows = await listJoinRequestsOfUser(c.env.DB, c.get("session").code);
  return ok(c, { join_requests: rows.map(toJoinRequest) });
});

// Ask for a seat. A plan that is not open to requests looks the same as one that does not exist.
meRoutes.post("/join-requests", async (c) => {
  const body = await readBody(c);
  const planCode = body.plan_code;
  if (planCode === undefined || planCode === null || planCode === "") fail("MISSING_PLAN_CODE");
  if (typeof planCode !== "string" || !isCode(CODE_PREFIX.plan, planCode)) fail("INVALID_PLAN_CODE");
  const note = optionalString(body, "note", NOTE_MAX);

  const ask = await findAskContext(c.env.DB, planCode, c.get("session").code);
  if (!ask || ask.active !== 1 || ask.accepting_requests !== 1) {
    return failure(c, "PLAN_NOT_OPEN", "The plan is not open to join requests.", 404);
  }
  if (ask.has_seat) return failure(c, "ALREADY_MEMBER", "You already hold a seat in this plan.", 409);
  // A plan opened from wishes is reserved for those wishers until its head start ends.
  if (ask.priority_until !== null && ask.priority_until > new Date().toISOString() && !ask.has_priority) {
    return failure(c, "PLAN_PRIORITY_ONLY", "For now only members who asked for this plan can join.", 409);
  }
  if (ask.has_pending) return failure(c, "JOIN_REQUEST_EXISTS", "You already asked to join this plan.", 409);
  if (ask.active_members >= ask.max_slots) return failure(c, "PLAN_FULL", "The plan has no free seat.", 409);

  try {
    const row = await insertJoinRequest(c.env.DB, {
      code: generateCode(CODE_PREFIX.joinRequest),
      plan_id: ask.plan_id,
      user_id: ask.user_id,
      note,
    });
    return ok(c, { join_request: toJoinRequest(row) }, "Request sent.", 201);
  } catch (err) {
    // A double tap passes the check above twice; join_requests_one_pending lets only one in.
    if (isUniqueViolation(err)) return failure(c, "JOIN_REQUEST_EXISTS", "You already asked to join this plan.", 409);
    throw err;
  }
});

// Withdraw an own request while it is still pending. Another member's request is 404.
meRoutes.post("/join-requests/:code/cancel", async (c) => {
  const request = await findJoinRequestByCode(c.env.DB, parseCode(CODE_PREFIX.joinRequest, c.req.param("code")));
  if (!request || request.user_code !== c.get("session").code) return notFound(c);
  const row = await cancelJoinRequest(c.env.DB, request.id, request.user_id);
  if (!row) return failure(c, "INVALID_STATUS_TRANSITION", `A ${request.status} request cannot be cancelled.`, 409);
  return ok(c, { join_request: toJoinRequest(row) }, "Request cancelled.");
});

// --- Plan wishes: ask for a plan of some service to be opened (docs/data-model.md#yêu-cầu-mở-gói).

const SERVICE_NAME_MAX = 64;

function toMyWish(row: MyWishRow): MyWish {
  return {
    code: row.code,
    provider: row.provider,
    service_name: row.service_name,
    note: row.note,
    status: row.status,
    created_at: row.created_at,
    decided_at: row.decided_at,
    // How many others wait with you matters only while the wish is open.
    others_waiting: row.status === "OPEN" ? row.others_waiting : 0,
    seen: row.seen_at !== null,
    plan:
      row.plan_code !== null
        ? {
            code: row.plan_code,
            name: row.plan_name!,
            provider: row.plan_provider!,
            member_amount: row.plan_member_amount!,
            open: row.plan_open === 1,
            free_seats: Math.max(0, row.plan_free_seats ?? 0),
            priority_until: row.plan_priority_until,
            joined: row.plan_joined === 1,
          }
        : null,
  };
}

meRoutes.get("/wishes", async (c) => {
  const rows = await listWishesOfUser(c.env.DB, c.get("session").code);
  return ok(c, { wishes: rows.map(toMyWish) });
});

// A listed provider is named by the provider; OTHER needs the service's name, and wishes for the
// same service group by its trimmed lowercase form.
meRoutes.post("/wishes", async (c) => {
  const body = await readBody(c);
  const provider = requireEnum(body, "provider", PROVIDERS);
  const serviceName = provider === "OTHER" ? requireString(body, "service_name", SERVICE_NAME_MAX) : null;
  const note = optionalString(body, "note", NOTE_MAX);
  try {
    const row = await insertWish(c.env.DB, {
      code: generateCode(CODE_PREFIX.wish),
      userCode: c.get("session").code,
      provider,
      serviceName,
      serviceKey: serviceName === null ? "" : serviceName.toLowerCase().replace(/\s+/g, " "),
      note,
    });
    return ok(c, { wish: toMyWish(row) }, "Wish sent.", 201);
  } catch (err) {
    // plan_wishes_one_open: this member already waits for this service.
    if (isUniqueViolation(err)) return failure(c, "WISH_EXISTS", "You already asked for this service.", 409);
    throw err;
  }
});

// Another member's wish is 404.
meRoutes.post("/wishes/:code/cancel", async (c) => {
  const wish = await findMyWish(c.env.DB, parseCode(CODE_PREFIX.wish, c.req.param("code")));
  if (!wish || wish.user_code !== c.get("session").code) return notFound(c);
  if (!(await closeWish(c.env.DB, wish.id, "CANCELLED"))) {
    return failure(c, "INVALID_STATUS_TRANSITION", `A ${wish.status} wish cannot be cancelled.`, 409);
  }
  return ok(c, { wish: toMyWish((await findMyWish(c.env.DB, wish.code))!) }, "Wish cancelled.");
});

// Dismiss the "your plan is open" notice for a fulfilled wish.
meRoutes.post("/wishes/:code/seen", async (c) => {
  const wish = await findMyWish(c.env.DB, parseCode(CODE_PREFIX.wish, c.req.param("code")));
  if (!wish || wish.user_code !== c.get("session").code) return notFound(c);
  await markWishSeen(c.env.DB, wish.id);
  return ok(c, { wish: toMyWish((await findMyWish(c.env.DB, wish.code))!) }, "Notice dismissed.");
});
