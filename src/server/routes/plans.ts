import { Hono } from "hono";
import { PROVIDERS } from "../../shared/providers";
import type { Cycle, Member, Period, Plan } from "../../shared/types";
import { requireAdmin, type AppEnv } from "../auth";
import {
  type PlanFields,
  type PlanRow,
  deletePlan,
  findPlanByCode,
  hasActiveSeat,
  insertPlan,
  listPlans,
  updatePlan,
} from "../db/plans";
import { findUserByCode } from "../db/users";
import { type MemberRow, insertMemberIfSeatFree, listMembersOfPlan } from "../db/members";
import { CODE_PREFIX, generateCode, isCode } from "../domain/code";
import { type PeriodRow, createPeriod, listPeriodsOfPlan } from "../db/periods";
import { currentPeriodInVietnam, isPeriod, todayInVietnam } from "../domain/period";
import { failure, notFound, ok } from "../envelope";
import {
  type Body,
  fail,
  has,
  optionalMatching,
  optionalString,
  parseCode,
  readBody,
  requireBoolean,
  requireEnum,
  requireDate,
  requireInteger,
  requireString,
  requireUserCode,
} from "../validate";

// Admin-only plan management. The plan price and the per-member amount are both set by hand —
// nothing is split, and every member of a plan pays the same.
// Spec: docs/data-model.md, docs/payments.md.
export const planRoutes = new Hono<AppEnv>();

planRoutes.use(requireAdmin);

const CYCLES: readonly Cycle[] = ["MONTHLY", "YEARLY"];
const NAME_MAX = 64;
const PRICE_MAX = 1_000_000_000;
const SLOTS_MAX = 50;
// NAPAS bank identification number.
const BANK_BIN = /^\d{6}$/;
const BANK_ACCOUNT_NO = /^\d{4,19}$/;

function toPlan(row: PlanRow): Plan {
  return {
    code: row.code,
    name: row.name,
    provider: row.provider,
    price: row.price,
    member_amount: row.member_amount,
    cycle: row.cycle,
    max_slots: row.max_slots,
    active_members: row.active_members,
    payer: { code: row.payer_code, display_name: row.payer_display_name },
    bank_bin: row.bank_bin,
    bank_account_no: row.bank_account_no,
    bank_account_name: row.bank_account_name,
    active: row.active === 1,
    accepting_requests: row.accepting_requests === 1,
    priority_until: row.priority_until,
    created_at: row.created_at,
  };
}

export function toMember(row: MemberRow): Member {
  return {
    code: row.code,
    user: { code: row.user_code, username: row.username, display_name: row.display_name },
    joined_on: row.joined_on,
    left_on: row.left_on,
  };
}

function toPeriod(row: PeriodRow): Period {
  return {
    code: row.code,
    period: row.period,
    price: row.price,
    payment_count: row.payment_count,
    paid_count: row.paid_count,
    amount_total: row.amount_total,
    amount_paid: row.amount_paid,
    created_at: row.created_at,
  };
}

// The payer is addressed by account code and must be an ADMIN: a role is a system permission,
// being a plan's payer is a property of the plan, and only an admin may hold it.
async function requirePayerId(db: D1Database, body: Body): Promise<number> {
  const user = await findUserByCode(db, requireUserCode(body, "payer_code"));
  if (!user) fail("INVALID_PAYER_CODE");
  if (user.role !== "ADMIN") fail("PAYER_MUST_BE_ADMIN", "The payer must be an admin.");
  return user.id;
}

// Opening a plan from wishes gives those members this head start to ask to join.
const WISH_PRIORITY_HOURS = 48;
// A D1 statement binds at most 100 values; one plan is not opened for more wishers than this.
const WISH_CODES_MAX = 50;

// wish_codes: the open wishes this plan answers (docs/api.md). Duplicates collapse; wishes no longer
// OPEN are skipped by the UPDATE itself.
function optionalWishCodes(body: Body): string[] {
  if (!has(body, "wish_codes")) return [];
  const raw = body.wish_codes;
  if (!Array.isArray(raw) || raw.length > WISH_CODES_MAX || !raw.every((code) => typeof code === "string" && isCode(CODE_PREFIX.wish, code))) {
    fail("INVALID_WISH_CODES");
  }
  return [...new Set(raw as string[])];
}

// QR needs both the BIN and the account number, so they are set or cleared together.
function checkBankDetails(bin: string | null, accountNo: string | null): void {
  if ((bin === null) !== (accountNo === null)) {
    fail("INCOMPLETE_BANK_DETAILS", "Bank BIN and account number are set or cleared together.");
  }
}

planRoutes.get("/", async (c) => {
  const rows = await listPlans(c.env.DB);
  return ok(c, { plans: rows.map(toPlan) });
});

planRoutes.get("/:code", async (c) => {
  const row = await findPlanByCode(c.env.DB, parseCode(CODE_PREFIX.plan, c.req.param("code")));
  if (!row) return notFound(c);
  return ok(c, { plan: toPlan(row) });
});

planRoutes.post("/", async (c) => {
  const body = await readBody(c);
  const fields: PlanFields = {
    name: requireString(body, "name", NAME_MAX),
    // Defaults like the column: a plan for a service not on the list is still a plan.
    provider: has(body, "provider") ? requireEnum(body, "provider", PROVIDERS) : "OTHER",
    price: requireInteger(body, "price", 1, PRICE_MAX),
    member_amount: requireInteger(body, "member_amount", 1, PRICE_MAX),
    cycle: requireEnum(body, "cycle", CYCLES),
    max_slots: requireInteger(body, "max_slots", 1, SLOTS_MAX),
    payer_id: await requirePayerId(c.env.DB, body),
    bank_bin: optionalMatching(body, "bank_bin", BANK_BIN),
    bank_account_no: optionalMatching(body, "bank_account_no", BANK_ACCOUNT_NO),
    bank_account_name: optionalString(body, "bank_account_name", NAME_MAX),
    active: has(body, "active") ? Number(requireBoolean(body, "active")) : 1,
    // Off unless asked for: opening a plan to every member is a deliberate choice.
    accepting_requests: has(body, "accepting_requests") ? Number(requireBoolean(body, "accepting_requests")) : 0,
  };
  checkBankDetails(fields.bank_bin, fields.bank_account_no);
  const wishCodes = optionalWishCodes(body);

  const { row, fulfilled } = await insertPlan(
    c.env.DB,
    generateCode(CODE_PREFIX.plan),
    fields,
    wishCodes.length > 0 ? { wishCodes, priorityHours: WISH_PRIORITY_HOURS } : null,
  );
  return ok(c, { plan: toPlan(row), wishes_fulfilled: fulfilled }, "Plan created.", 201);
});

// price / member_amount changes affect only periods created afterwards — past periods keep their snapshot.
planRoutes.patch("/:code", async (c) => {
  const plan = await findPlanByCode(c.env.DB, parseCode(CODE_PREFIX.plan, c.req.param("code")));
  if (!plan) return notFound(c);

  const body = await readBody(c);
  // Built field by field from the allowlist — never from the body itself.
  const patch: Partial<PlanFields> = {};
  if (has(body, "name")) patch.name = requireString(body, "name", NAME_MAX);
  if (has(body, "provider")) patch.provider = requireEnum(body, "provider", PROVIDERS);
  if (has(body, "price")) patch.price = requireInteger(body, "price", 1, PRICE_MAX);
  if (has(body, "member_amount")) patch.member_amount = requireInteger(body, "member_amount", 1, PRICE_MAX);
  if (has(body, "cycle")) patch.cycle = requireEnum(body, "cycle", CYCLES);
  if (has(body, "max_slots")) patch.max_slots = requireInteger(body, "max_slots", 1, SLOTS_MAX);
  if (has(body, "payer_code")) patch.payer_id = await requirePayerId(c.env.DB, body);
  if (has(body, "bank_bin")) patch.bank_bin = optionalMatching(body, "bank_bin", BANK_BIN);
  if (has(body, "bank_account_no")) patch.bank_account_no = optionalMatching(body, "bank_account_no", BANK_ACCOUNT_NO);
  if (has(body, "bank_account_name")) patch.bank_account_name = optionalString(body, "bank_account_name", NAME_MAX);
  if (has(body, "active")) patch.active = Number(requireBoolean(body, "active"));
  if (has(body, "accepting_requests")) patch.accepting_requests = Number(requireBoolean(body, "accepting_requests"));
  if (Object.keys(patch).length === 0) fail("NOTHING_TO_UPDATE", "No updatable field was sent.");

  checkBankDetails(
    patch.bank_bin !== undefined ? patch.bank_bin : plan.bank_bin,
    patch.bank_account_no !== undefined ? patch.bank_account_no : plan.bank_account_no,
  );
  if (patch.max_slots !== undefined && patch.max_slots < plan.active_members) {
    return failure(c, "SLOTS_BELOW_MEMBERS", "The plan has more active members than that.", 409);
  }
  if (patch.payer_id !== undefined && patch.payer_id !== plan.payer_id && (await hasActiveSeat(c.env.DB, plan.id, patch.payer_id))) {
    return failure(c, "PAYER_IS_MEMBER", "The new payer holds a seat in this plan; remove the seat first.", 409);
  }

  const row = await updatePlan(c.env.DB, plan.id, patch);
  return ok(c, { plan: toPlan(row) }, "Plan updated.");
});

// A plan with seats or periods is kept by the FKs -> 409 RELATED_DATA_EXISTS; set active = false instead.
planRoutes.delete("/:code", async (c) => {
  const plan = await findPlanByCode(c.env.DB, parseCode(CODE_PREFIX.plan, c.req.param("code")));
  if (!plan) return notFound(c);
  await deletePlan(c.env.DB, plan.id);
  return ok(c, null, "Plan deleted.");
});

// Every seat, active first. Past seats stay as history.
planRoutes.get("/:code/members", async (c) => {
  const plan = await findPlanByCode(c.env.DB, parseCode(CODE_PREFIX.plan, c.req.param("code")));
  if (!plan) return notFound(c);
  const rows = await listMembersOfPlan(c.env.DB, plan.id);
  return ok(c, { members: rows.map(toMember) });
});

// Adds a seat; the member pays the plan's member_amount. The payer never holds a seat in their own plan, and the
// seat limit is checked inside the INSERT itself.
planRoutes.post("/:code/members", async (c) => {
  const plan = await findPlanByCode(c.env.DB, parseCode(CODE_PREFIX.plan, c.req.param("code")));
  if (!plan) return notFound(c);

  const body = await readBody(c);
  const user = await findUserByCode(c.env.DB, requireUserCode(body, "user_code"));
  if (!user) fail("INVALID_USER_CODE");
  const joinedOn = has(body, "joined_on") ? requireDate(body, "joined_on") : todayInVietnam();

  if (plan.active !== 1) return failure(c, "PLAN_INACTIVE", "The plan is not active.", 409);
  if (user.id === plan.payer_id) {
    return failure(c, "PAYER_CANNOT_BE_MEMBER", "The plan's payer cannot hold a seat in it.", 409);
  }

  const row = await insertMemberIfSeatFree(c.env.DB, {
    code: generateCode(CODE_PREFIX.member),
    plan_id: plan.id,
    user_id: user.id,
    joined_on: joinedOn,
  });
  if (!row) return failure(c, "PLAN_FULL", "The plan has no free seat.", 409);
  return ok(c, { member: toMember(row) }, "Member added.", 201);
});

// Newest first, each with its payments summarised.
planRoutes.get("/:code/periods", async (c) => {
  const plan = await findPlanByCode(c.env.DB, parseCode(CODE_PREFIX.plan, c.req.param("code")));
  if (!plan) return notFound(c);
  const rows = await listPeriodsOfPlan(c.env.DB, plan.id);
  return ok(c, { periods: rows.map(toPeriod) });
});

// Creates a period by hand — the same path the monthly cron takes. Idempotent: an existing period
// is returned untouched (200, created: false), never recomputed from today's plan or seats.
planRoutes.post("/:code/periods", async (c) => {
  const plan = await findPlanByCode(c.env.DB, parseCode(CODE_PREFIX.plan, c.req.param("code")));
  if (!plan) return notFound(c);

  const body = await readBody(c);
  const current = currentPeriodInVietnam();
  let period = current;
  if (has(body, "period")) {
    const raw = body.period;
    if (typeof raw !== "string" || !isPeriod(raw)) fail("INVALID_PERIOD");
    // A future period would snapshot today's price and seats for a month that has not started.
    if (raw > current) fail("INVALID_PERIOD", "The period cannot be in the future.");
    period = raw;
  }
  if (plan.active !== 1) return failure(c, "PLAN_INACTIVE", "The plan is not active.", 409);

  const { row, created } = await createPeriod(c.env.DB, plan.id, period);
  return created
    ? ok(c, { period: toPeriod(row), created }, "Period created.", 201)
    : ok(c, { period: toPeriod(row), created }, "Period already exists.");
});
