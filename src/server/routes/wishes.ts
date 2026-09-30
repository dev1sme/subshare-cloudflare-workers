import { Hono } from "hono";
import type { Wish } from "../../shared/types";
import { requireAdmin, type AppEnv } from "../auth";
import { type WishRow, closeWish, findWishByCode, listOpenWishes } from "../db/wishes";
import { CODE_PREFIX } from "../domain/code";
import { failure, notFound, ok } from "../envelope";
import { parseCode } from "../validate";

// Admin side of plan wishes: the open list (grouped by service in the UI) and declining one.
// Opening a plan from wishes is POST /api/plans with wish_codes. Spec: docs/api.md.
export const wishRoutes = new Hono<AppEnv>();

wishRoutes.use(requireAdmin);

export function toWish(row: WishRow): Wish {
  return {
    code: row.code,
    provider: row.provider,
    service_name: row.service_name,
    note: row.note,
    status: row.status,
    created_at: row.created_at,
    decided_at: row.decided_at,
    user: { code: row.user_code, username: row.username, display_name: row.display_name },
  };
}

wishRoutes.get("/", async (c) => {
  const rows = await listOpenWishes(c.env.DB);
  return ok(c, { wishes: rows.map(toWish) });
});

wishRoutes.post("/:code/decline", async (c) => {
  const wish = await findWishByCode(c.env.DB, parseCode(CODE_PREFIX.wish, c.req.param("code")));
  if (!wish) return notFound(c);
  if (!(await closeWish(c.env.DB, wish.id, "DECLINED"))) {
    return failure(c, "INVALID_STATUS_TRANSITION", `A ${wish.status} wish cannot be declined.`, 409);
  }
  return ok(c, { wish: toWish((await findWishByCode(c.env.DB, wish.code))!) }, "Wish declined.");
});
