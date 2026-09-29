// Plans. Full CRUD lands with plan management; for now only what account management needs.

// A plan's payer must stay an ADMIN, so demoting one is refused while they pay for any plan.
export async function isPayerOfAnyPlan(db: D1Database, userId: number): Promise<boolean> {
  const row = await db.prepare("SELECT 1 AS found FROM plans WHERE payer_id = ? LIMIT 1").bind(userId).first();
  return row !== null;
}
