import { createPeriod } from "./db/periods";
import { listActivePlanIds } from "./db/plans";
import { currentPeriodInVietnam } from "./domain/period";

/**
 * The Worker's single Cron Trigger job: make sure every active plan has its period for the current
 * month (in Vietnam time — the trigger fires in UTC). Members are billed monthly whatever
 * plans.cycle says; YEARLY only describes how the payer pays the provider. Safe to run any number
 * of times a month: createPeriod is idempotent, so running it daily also retries a failed run.
 *
 * Budget: each plan costs two D1 calls; the free tier allows 50 subrequests per invocation.
 */
export async function createDuePeriods(db: D1Database, now: Date): Promise<{ created: number; failed: number }> {
  const period = currentPeriodInVietnam(now);
  const planIds = await listActivePlanIds(db);
  let created = 0;
  let failed = 0;
  // Sequential and per-plan: one broken plan must not stop the others.
  for (const planId of planIds) {
    try {
      if ((await createPeriod(db, planId, period)).created) created++;
    } catch (err) {
      failed++;
      console.error(`createDuePeriods: plan ${planId}, period ${period}`, err);
    }
  }
  return { created, failed };
}
