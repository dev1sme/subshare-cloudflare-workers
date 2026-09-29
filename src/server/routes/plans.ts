import { Hono } from "hono";
import type { Cycle, Member, Plan } from "../../shared/types";
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
import { CODE_PREFIX, generateCode } from "../domain/code";
import { todayInVietnam } from "../domain/period";
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

// The payer is addressed by account code and must be an ADMIN: a role is a system permission,
// being a plan's payer is a property of the plan, and only an admin may hold it.
async function requirePayerId(db: D1Database, body: Body): Promise<number> {
  const user = await findUserByCode(db, requireUserCode(body, "payer_code"));
  if (!user) fail("INVALID_PAYER_CODE");
  if (user.role !== "ADMIN") fail("PAYER_MUST_BE_ADMIN", "The payer must be an admin.");
  return user.id;
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
    price: requireInteger(body, "price", 1, PRICE_MAX),
    member_amount: requireInteger(body, "member_amount", 1, PRICE_MAX),
    cycle: requireEnum(body, "cycle", CYCLES),
    max_slots: requireInteger(body, "max_slots", 1, SLOTS_MAX),
    payer_id: await requirePayerId(c.env.DB, body),
    bank_bin: optionalMatching(body, "bank_bin", BANK_BIN),
    bank_account_no: optionalMatching(body, "bank_account_no", BANK_ACCOUNT_NO),
    bank_account_name: optionalString(body, "bank_account_name", NAME_MAX),
    active: has(body, "active") ? Number(requireBoolean(body, "active")) : 1,
  };
  checkBankDetails(fields.bank_bin, fields.bank_account_no);

  const row = await insertPlan(c.env.DB, generateCode(CODE_PREFIX.plan), fields);
  return ok(c, { plan: toPlan(row) }, "Plan created.", 201);
});

// price / member_amount changes affect only periods created afterwards — past periods keep their snapshot.
planRoutes.patch("/:code", async (c) => {
  const plan = await findPlanByCode(c.env.DB, parseCode(CODE_PREFIX.plan, c.req.param("code")));
  if (!plan) return notFound(c);

  const body = await readBody(c);
  // Built field by field from the allowlist — never from the body itself.
  const patch: Partial<PlanFields> = {};
  if (has(body, "name")) patch.name = requireString(body, "name", NAME_MAX);
  if (has(body, "price")) patch.price = requireInteger(body, "price", 1, PRICE_MAX);
  if (has(body, "member_amount")) patch.member_amount = requireInteger(body, "member_amount", 1, PRICE_MAX);
  if (has(body, "cycle")) patch.cycle = requireEnum(body, "cycle", CYCLES);
  if (has(body, "max_slots")) patch.max_slots = requireInteger(body, "max_slots", 1, SLOTS_MAX);
  if (has(body, "payer_code")) patch.payer_id = await requirePayerId(c.env.DB, body);
  if (has(body, "bank_bin")) patch.bank_bin = optionalMatching(body, "bank_bin", BANK_BIN);
  if (has(body, "bank_account_no")) patch.bank_account_no = optionalMatching(body, "bank_account_no", BANK_ACCOUNT_NO);
  if (has(body, "bank_account_name")) patch.bank_account_name = optionalString(body, "bank_account_name", NAME_MAX);
  if (has(body, "active")) patch.active = Number(requireBoolean(body, "active"));
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
