# Data model

Spec: `docs/data-model.md`. Read it before writing a migration, adding a column, or computing money.

Must hold:

- A member's share is snapshotted onto `payments.amount` when a billing period is created. Never recompute a past period from today's `plans.price` or today's `plan_members`.
- Money is `INTEGER` VND — no floats, no minor units. Splitting a price distributes the remainder by a fixed rule so the shares of one period sum exactly to the price.
- Dates are ISO `TEXT`. `period` is `YYYY-MM`, computed in `Asia/Ho_Chi_Minh`.
- `UNIQUE(plan_id, period)` on `billing_periods` and `UNIQUE(billing_period_id, user_id)` on `payments` — creating a period twice (a cron retry, a double click) must be a no-op, not a duplicate.
- Every URL-addressable table has a random, prefixed `code`; ids never appear in URLs.
- Enums are CHECK-constrained UPPER_SNAKE; changing one means rebuilding the table in a migration.
- Deletes are blocked by FKs, never cascaded, once money rows exist.
- A migration file that has been applied anywhere is never edited — add a new one.

When adding a table/column/enum, update `docs/data-model.md` in the same commit.
