import { Hono } from "hono";
import type { JoinRequest, JoinRequestStatus } from "../../shared/types";
import { requireAdmin, type AppEnv } from "../auth";
import {
  type JoinRequestRow,
  approveJoinRequest,
  findJoinRequestByCode,
  listJoinRequests,
  rejectJoinRequest,
} from "../db/joinRequests";
import { hasActiveSeat } from "../db/plans";
import { CODE_PREFIX, generateCode } from "../domain/code";
import { todayInVietnam } from "../domain/period";
import { failure, notFound, ok } from "../envelope";
import { type Body, fail, has, parseCode, readBody, requireDate } from "../validate";

// Admin side of join requests: the queue, approve (creates the seat), reject.
// Spec: docs/api.md, docs/data-model.md#xin-vào-gói.
export const joinRequestRoutes = new Hono<AppEnv>();

joinRequestRoutes.use(requireAdmin);

const STATUSES: readonly JoinRequestStatus[] = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

export function toJoinRequest(row: JoinRequestRow): JoinRequest {
  return {
    code: row.code,
    plan: {
      code: row.plan_code,
      name: row.plan_name,
      provider: row.plan_provider,
      member_amount: row.member_amount,
      max_slots: row.max_slots,
      active_members: row.active_members,
    },
    user: { code: row.user_code, username: row.username, display_name: row.display_name },
    status: row.status,
    note: row.note,
    created_at: row.created_at,
    decided_at: row.decided_at,
  };
}

// ?status= defaults to PENDING: the list an admin opens this screen for.
joinRequestRoutes.get("/", async (c) => {
  const status = c.req.query("status") ?? "PENDING";
  if (!STATUSES.includes(status as JoinRequestStatus)) fail("INVALID_STATUS");
  const rows = await listJoinRequests(c.env.DB, status as JoinRequestStatus);
  return ok(c, { join_requests: rows.map(toJoinRequest) });
});

// Body optional: { joined_on } (defaults to today in Vietnam). The seat is billed from the first
// period whose 1st it covers — approving on the 15th means paying from next month.
joinRequestRoutes.post("/:code/approve", async (c) => {
  const request = await findJoinRequestByCode(c.env.DB, parseCode(CODE_PREFIX.joinRequest, c.req.param("code")));
  if (!request) return notFound(c);

  const body: Body = c.req.header("Content-Type")?.includes("application/json") ? await readBody(c) : {};
  const joinedOn = has(body, "joined_on") ? requireDate(body, "joined_on") : todayInVietnam();

  if (request.status !== "PENDING") {
    return failure(c, "INVALID_STATUS_TRANSITION", `A ${request.status} request cannot be approved.`, 409);
  }
  if (request.plan_active !== 1) return failure(c, "PLAN_INACTIVE", "The plan is not active.", 409);
  if (await hasActiveSeat(c.env.DB, request.plan_id, request.user_id)) {
    return failure(c, "ALREADY_MEMBER", "The member already holds a seat in this plan.", 409);
  }

  const { row, approved } = await approveJoinRequest(c.env.DB, {
    id: request.id,
    memberCode: generateCode(CODE_PREFIX.member),
    joinedOn,
    adminCode: c.get("session").code,
  });
  if (!approved) {
    // Re-read state explains the refusal: someone else decided first, or the last seat went.
    if (row.status !== "PENDING") {
      return failure(c, "INVALID_STATUS_TRANSITION", `A ${row.status} request cannot be approved.`, 409);
    }
    if (row.plan_active !== 1) return failure(c, "PLAN_INACTIVE", "The plan is not active.", 409);
    return failure(c, "PLAN_FULL", "The plan has no free seat.", 409);
  }
  return ok(c, { join_request: toJoinRequest(row) }, "Request approved.");
});

joinRequestRoutes.post("/:code/reject", async (c) => {
  const request = await findJoinRequestByCode(c.env.DB, parseCode(CODE_PREFIX.joinRequest, c.req.param("code")));
  if (!request) return notFound(c);
  const row = await rejectJoinRequest(c.env.DB, request.id, c.get("session").code);
  if (!row) return failure(c, "INVALID_STATUS_TRANSITION", `A ${request.status} request cannot be rejected.`, 409);
  return ok(c, { join_request: toJoinRequest(row) }, "Request rejected.");
});
