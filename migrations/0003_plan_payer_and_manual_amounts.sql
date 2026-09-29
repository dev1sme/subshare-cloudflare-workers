-- Amounts are set by the admin, not computed; each plan has a payer. Spec: docs/data-model.md.
--
--   * plans.split_mode is dropped: nothing is split automatically any more. The price is paid in
--     USD with fees, so the admin sets both the plan price and every member's amount by hand.
--   * plans.payer_id is added: the admin who pays the provider and receives the members' money.
--     A role is a permission on the system; being the payer is a property of one plan.
--   * plan_members.weight is replaced by plan_members.amount: what that member pays per cycle.
--     The payer has no seat in plan_members, so no payment row is ever created for them.
--
-- SQLite cannot add a NOT NULL REFERENCES column or drop a CHECK-constrained column in place, so
-- both tables are rebuilt. D1 does not allow turning foreign_keys off in a migration, so the usual
-- "create new_X, copy, drop X, rename" order fails once rows exist: DROP TABLE deletes the parent
-- rows and orphans billing_periods / plan_members, and rows copied into new_X *before* the drop never
-- count as those parents coming back. Instead: copy out to a scratch table, drop, re-create under the
-- final name, copy back in — inserting into `plans` itself is what resolves the deferred violations.

PRAGMA defer_foreign_keys = true;

CREATE TABLE plans_backup AS SELECT * FROM plans;
DROP TABLE plans;

CREATE TABLE plans (
  id                INTEGER PRIMARY KEY,
  code              TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'PL'),
  name              TEXT    NOT NULL,
  -- What one cycle costs the payer in VND, fees included. Set by hand, never converted from USD here.
  price             INTEGER NOT NULL CHECK (price > 0),
  cycle             TEXT    NOT NULL CHECK (cycle IN ('MONTHLY', 'YEARLY')),
  -- Seats for members; the payer is not counted.
  max_slots         INTEGER NOT NULL CHECK (max_slots >= 1),
  -- Must be an ADMIN (checked by the app: a cross-table rule cannot be a CHECK).
  payer_id          INTEGER NOT NULL REFERENCES users (id),
  -- Bank details are data entered through the UI, never committed (docs/payments.md). NULL = not set.
  bank_bin          TEXT,
  bank_account_no   TEXT,
  bank_account_name TEXT,
  active            INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
) STRICT;

-- Existing plans (none at the time of writing) get the first admin as payer.
INSERT INTO plans (id, code, name, price, cycle, max_slots, payer_id, bank_bin, bank_account_no, bank_account_name, active, created_at)
SELECT id, code, name, price, cycle, max_slots,
       (SELECT id FROM users WHERE role = 'ADMIN' ORDER BY id LIMIT 1),
       bank_bin, bank_account_no, bank_account_name, active, created_at
FROM plans_backup;

DROP TABLE plans_backup;

CREATE INDEX plans_payer_id ON plans (payer_id);

CREATE TABLE plan_members_backup AS SELECT * FROM plan_members;
DROP TABLE plan_members;

CREATE TABLE plan_members (
  id        INTEGER PRIMARY KEY,
  code      TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'MB'),
  plan_id   INTEGER NOT NULL REFERENCES plans (id),
  user_id   INTEGER NOT NULL REFERENCES users (id),
  -- What this member pays per cycle in VND, set by the admin. Snapshotted onto payments.amount
  -- when a period is created; changing it only affects later periods.
  amount    INTEGER NOT NULL CHECK (amount >= 0),
  joined_on TEXT    NOT NULL,
  -- Leaving sets left_on; the row stays as history and is never deleted.
  left_on   TEXT,
  CHECK (left_on IS NULL OR left_on >= joined_on)
) STRICT;

-- Existing seats (none at the time of writing) start at 0 and must be set by the admin.
INSERT INTO plan_members (id, code, plan_id, user_id, amount, joined_on, left_on)
SELECT id, code, plan_id, user_id, 0, joined_on, left_on
FROM plan_members_backup;

DROP TABLE plan_members_backup;

-- Indexes were dropped with the old table.
CREATE UNIQUE INDEX plan_members_active_unique ON plan_members (plan_id, user_id) WHERE left_on IS NULL;
CREATE INDEX plan_members_plan_id ON plan_members (plan_id);
CREATE INDEX plan_members_user_id ON plan_members (user_id);
