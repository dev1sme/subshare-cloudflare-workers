import type { Provider } from "../../shared/providers";
import type { WishStatus } from "../../shared/types";

// plan_wishes: a member asks for a plan of some service to be opened; an admin opens one from the
// wishes (see insertPlan) or declines them. Every status change is guarded inside its UPDATE.
// Spec: docs/data-model.md#yêu-cầu-mở-gói.

const NOW = "strftime('%Y-%m-%dT%H:%M:%SZ', 'now')";

type WishRowBase = {
  id: number;
  code: string;
  user_id: number;
  provider: Provider;
  service_name: string | null;
  service_key: string;
  note: string | null;
  status: WishStatus;
  created_at: string;
  decided_at: string | null;
};

export type MyWishRow = WishRowBase & {
  user_code: string;
  seen_at: string | null;
  others_waiting: number;
  plan_code: string | null;
  plan_name: string | null;
  plan_provider: Provider | null;
  plan_member_amount: number | null;
  plan_open: number | null;
  plan_free_seats: number | null;
  plan_priority_until: string | null;
  plan_joined: number | null;
};

export type WishRow = WishRowBase & { user_code: string; username: string; display_name: string };

// Others waiting for the same service count only OPEN wishes (index plan_wishes_status); the plan
// part is read only for a fulfilled wish whose plan still exists.
const SELECT_MY_WISH = `
  SELECT w.id, w.code, w.user_id, u.code AS user_code, w.provider, w.service_name, w.service_key, w.note, w.status, w.created_at, w.decided_at, w.seen_at,
         (SELECT COUNT(*) FROM plan_wishes o
          WHERE o.status = 'OPEN' AND o.provider = w.provider AND o.service_key = w.service_key AND o.user_id <> w.user_id) AS others_waiting,
         p.code AS plan_code, p.name AS plan_name, p.provider AS plan_provider, p.member_amount AS plan_member_amount,
         (p.active = 1 AND p.accepting_requests = 1) AS plan_open,
         p.max_slots - (SELECT COUNT(*) FROM plan_members m WHERE m.plan_id = p.id AND m.left_on IS NULL) AS plan_free_seats,
         p.priority_until AS plan_priority_until,
         (EXISTS (SELECT 1 FROM plan_members m WHERE m.plan_id = p.id AND m.user_id = w.user_id AND m.left_on IS NULL)
          OR EXISTS (SELECT 1 FROM join_requests r WHERE r.plan_id = p.id AND r.user_id = w.user_id AND r.status = 'PENDING')) AS plan_joined
  FROM plan_wishes w
  JOIN users u ON u.id = w.user_id
  LEFT JOIN plans p ON p.id = w.plan_id`;

const SELECT_WISH = `
  SELECT w.id, w.code, w.user_id, w.provider, w.service_name, w.service_key, w.note, w.status, w.created_at, w.decided_at,
         u.code AS user_code, u.username, u.display_name
  FROM plan_wishes w
  JOIN users u ON u.id = w.user_id`;

// The member's own wishes, newest first.
export async function listWishesOfUser(db: D1Database, userCode: string): Promise<MyWishRow[]> {
  const { results } = await db
    .prepare(`${SELECT_MY_WISH} WHERE w.user_id = (SELECT id FROM users WHERE code = ?) ORDER BY w.created_at DESC, w.id DESC LIMIT 100`)
    .bind(userCode)
    .all<MyWishRow>();
  return results;
}

export function findMyWish(db: D1Database, code: string): Promise<MyWishRow | null> {
  return db.prepare(`${SELECT_MY_WISH} WHERE w.code = ?`).bind(code).first<MyWishRow>();
}

// Open wishes for the admin, oldest first (who asked first is listed first within a service).
export async function listOpenWishes(db: D1Database): Promise<WishRow[]> {
  const { results } = await db
    .prepare(`${SELECT_WISH} WHERE w.status = 'OPEN' ORDER BY w.created_at, w.id LIMIT 500`)
    .all<WishRow>();
  return results;
}

export function findWishByCode(db: D1Database, code: string): Promise<WishRow | null> {
  return db.prepare(`${SELECT_WISH} WHERE w.code = ?`).bind(code).first<WishRow>();
}

// A second OPEN wish for the same service violates plan_wishes_one_open (caught by the route).
export async function insertWish(
  db: D1Database,
  wish: { code: string; userCode: string; provider: Provider; serviceName: string | null; serviceKey: string; note: string | null },
): Promise<MyWishRow> {
  const [, selected] = await db.batch<MyWishRow>([
    db
      .prepare(
        `INSERT INTO plan_wishes (code, user_id, provider, service_name, service_key, note)
         VALUES (?, (SELECT id FROM users WHERE code = ?), ?, ?, ?, ?)`,
      )
      .bind(wish.code, wish.userCode, wish.provider, wish.serviceName, wish.serviceKey, wish.note),
    db.prepare(`${SELECT_MY_WISH} WHERE w.code = ?`).bind(wish.code),
  ]);
  return selected.results[0];
}

// OPEN -> CANCELLED (the member) or DECLINED (an admin). null = it was no longer OPEN.
export async function closeWish(db: D1Database, id: number, to: "CANCELLED" | "DECLINED"): Promise<boolean> {
  const result = await db
    .prepare(`UPDATE plan_wishes SET status = ?, decided_at = ${NOW} WHERE id = ? AND status = 'OPEN'`)
    .bind(to, id)
    .run();
  return result.meta.changes === 1;
}

// The member dismissed the "your plan is open" notice. Idempotent.
export async function markWishSeen(db: D1Database, id: number): Promise<void> {
  await db.prepare(`UPDATE plan_wishes SET seen_at = COALESCE(seen_at, ${NOW}) WHERE id = ? AND status = 'FULFILLED'`).bind(id).run();
}

// Part of the plan-creating batch: the given OPEN wishes become FULFILLED by that plan. Wishes that
// were cancelled or declined meanwhile are left alone. Codes are bound one placeholder each.
export function fulfilWishesStatement(db: D1Database, planCode: string, wishCodes: string[]): D1PreparedStatement {
  const placeholders = wishCodes.map(() => "?").join(", ");
  return db
    .prepare(
      `UPDATE plan_wishes SET status = 'FULFILLED', decided_at = ${NOW}, plan_id = (SELECT id FROM plans WHERE code = ?)
       WHERE status = 'OPEN' AND code IN (${placeholders})`,
    )
    .bind(planCode, ...wishCodes);
}
