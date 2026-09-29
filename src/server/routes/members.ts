import { Hono } from "hono";
import { requireAdmin, type AppEnv } from "../auth";
import { type MemberPatch, findMemberByCode, updateMember } from "../db/members";
import { CODE_PREFIX } from "../domain/code";
import { todayInVietnam } from "../domain/period";
import { notFound, ok } from "../envelope";
import { fail, has, parseCode, readBody, requireDate, requireInteger } from "../validate";
import { PRICE_MAX, toMember } from "./plans";

// Admin-only changes to one seat. There is no delete: leaving sets left_on and the row stays as
// history. A new amount applies to periods created afterwards; past payments keep their snapshot.
export const memberRoutes = new Hono<AppEnv>();

memberRoutes.use(requireAdmin);

memberRoutes.patch("/:code", async (c) => {
  const member = await findMemberByCode(c.env.DB, parseCode(CODE_PREFIX.member, c.req.param("code")));
  if (!member) return notFound(c);

  const body = await readBody(c);
  // Built field by field from the allowlist — never from the body itself.
  const patch: MemberPatch = {};
  if (has(body, "amount")) patch.amount = requireInteger(body, "amount", 0, PRICE_MAX);
  if (has(body, "left_on")) {
    // No un-leaving (it would bypass the seat limit): to come back, add a new seat.
    const leftOn = requireDate(body, "left_on");
    if (leftOn < member.joined_on) fail("LEFT_BEFORE_JOINED", "left_on is before joined_on.");
    if (leftOn > todayInVietnam()) fail("INVALID_LEFT_ON", "left_on cannot be in the future.");
    patch.left_on = leftOn;
  }
  if (Object.keys(patch).length === 0) fail("NOTHING_TO_UPDATE", "No updatable field was sent.");

  const row = await updateMember(c.env.DB, member.id, patch);
  return ok(c, { member: toMember(row) }, "Member updated.");
});
