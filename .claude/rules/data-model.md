# Data model

Spec: `docs/data-model.md`. Read it before writing a migration, adding a column, or computing money.

Must hold:

- A member's share is snapshotted onto `payments.amount` when a billing period is created. Never recompute a past period from today's `plans.price` or today's `plan_members`.
- Money is `INTEGER` VND — no floats, no minor units. Nothing is split automatically: the admin sets `plans.price` (fees included) and `plans.member_amount` (the same for every member of the plan). There is no "sum equals price" invariant.
- `users.role` is a system permission; `plans.payer_id` is per plan and must be an ADMIN. The payer has no `plan_members` seat, so never a `payments` row.
- Rebuilding a table in a migration: backup → drop → create under the final name → copy back (D1 cannot turn `foreign_keys` off). Test it on a database that has rows.
- A period `YYYY-MM` bills every seat present on its 1st: `joined_on <= 'YYYY-MM-01' AND (left_on IS NULL OR left_on >= 'YYYY-MM-01')`.
- Dates are ISO `TEXT`. `period` is `YYYY-MM`, computed in `Asia/Ho_Chi_Minh`.
- `UNIQUE(plan_id, period)` on `billing_periods` and `UNIQUE(billing_period_id, user_id)` on `payments` — creating a period twice (a cron retry, a double click) must be a no-op, not a duplicate.
- Every URL-addressable table has a random, prefixed `code`; ids never appear in URLs.
- Enums are CHECK-constrained UPPER_SNAKE; changing one means rebuilding the table in a migration.
- Deletes are blocked by FKs, never cascaded, once money rows exist.
- A migration file that has been applied anywhere is never edited — add a new one.

When adding a table/column/enum, update `docs/data-model.md` in the same commit.
