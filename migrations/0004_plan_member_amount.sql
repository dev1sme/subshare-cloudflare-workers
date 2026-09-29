-- Every member of a plan pays the same amount, so it belongs to the plan, not to the seat.
-- Spec: docs/data-model.md.
--
--   * plans.member_amount is added: VND each member pays per cycle, set by the admin next to
--     plans.price (what the payer pays the provider, fees included). The two are independent.
--   * plan_members.amount is dropped.
--
-- Both tables are rebuilt with the backup -> drop -> create -> copy order (see 0003 and
-- docs/data-model.md#dựng-lại-bảng-trong-migration): D1 cannot turn foreign_keys off.

PRAGMA defer_foreign_keys = true;

CREATE TABLE plans_backup AS SELECT * FROM plans;
DROP TABLE plans;

CREATE TABLE plans (
  id                INTEGER PRIMARY KEY,
  code              TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'PL'),
  name              TEXT    NOT NULL,
  -- What one cycle costs the payer in VND, fees included. Set by hand, never converted from USD here.
  price             INTEGER NOT NULL CHECK (price > 0),
  -- What each member pays per cycle in VND, set by hand. Snapshotted onto payments.amount when a
  -- period is created; changing it only affects later periods.
  member_amount     INTEGER NOT NULL CHECK (member_amount > 0),
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

-- Existing plans (none at the time of writing) take the highest amount any of their active seats
-- had, or 1 VND as a visible placeholder the admin must correct.
INSERT INTO plans (id, code, name, price, member_amount, cycle, max_slots, payer_id,
                   bank_bin, bank_account_no, bank_account_name, active, created_at)
SELECT b.id, b.code, b.name, b.price,
       COALESCE((SELECT MAX(m.amount) FROM plan_members m WHERE m.plan_id = b.id AND m.left_on IS NULL AND m.amount > 0), 1),
       b.cycle, b.max_slots, b.payer_id, b.bank_bin, b.bank_account_no, b.bank_account_name, b.active, b.created_at
FROM plans_backup b;

DROP TABLE plans_backup;

CREATE INDEX plans_payer_id ON plans (payer_id);

CREATE TABLE plan_members_backup AS SELECT * FROM plan_members;
DROP TABLE plan_members;

CREATE TABLE plan_members (
  id        INTEGER PRIMARY KEY,
  code      TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'MB'),
  plan_id   INTEGER NOT NULL REFERENCES plans (id),
  user_id   INTEGER NOT NULL REFERENCES users (id),
  joined_on TEXT    NOT NULL,
  -- Leaving sets left_on; the row stays as history and is never deleted.
  left_on   TEXT,
  CHECK (left_on IS NULL OR left_on >= joined_on)
) STRICT;

INSERT INTO plan_members (id, code, plan_id, user_id, joined_on, left_on)
SELECT id, code, plan_id, user_id, joined_on, left_on
FROM plan_members_backup;

DROP TABLE plan_members_backup;

-- Indexes were dropped with the old table.
CREATE UNIQUE INDEX plan_members_active_unique ON plan_members (plan_id, user_id) WHERE left_on IS NULL;
CREATE INDEX plan_members_plan_id ON plan_members (plan_id);
CREATE INDEX plan_members_user_id ON plan_members (user_id);
