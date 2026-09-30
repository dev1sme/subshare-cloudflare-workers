-- Prepayments of any length from 1 to 24 months. Spec: docs/data-model.md#trả-trước.
--
-- An admin records "paid up to month X" for a member who paid outside the app (cash, a transfer
-- for several months at once): that is a prepayment created PAID, and its length is whatever the
-- member paid for. A member starting one in the app is still offered 3, 6 or 12 only — that rule
-- lives in the route (PREPAY_MONTHS), not in the table.
--
-- Changing a CHECK means rebuilding the table. payments.prepayment_id points at prepayments, and
-- D1 does not allow turning foreign_keys off in a migration: defer the checks to the end, copy out,
-- drop, re-create under the final name and copy back with the same ids, so every payment still
-- points at its prepayment when the checks run.

PRAGMA defer_foreign_keys = true;

CREATE TABLE prepayments_backup AS SELECT * FROM prepayments;
DROP TABLE prepayments;

CREATE TABLE prepayments (
  id               INTEGER PRIMARY KEY,
  -- Also the bank transfer note.
  code             TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'PP'),
  plan_id          INTEGER NOT NULL REFERENCES plans (id),
  user_id          INTEGER NOT NULL REFERENCES users (id),
  start_period     TEXT    NOT NULL CHECK (start_period GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]' AND substr(start_period, 6, 2) BETWEEN '01' AND '12'),
  end_period       TEXT    NOT NULL CHECK (end_period GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]' AND substr(end_period, 6, 2) BETWEEN '01' AND '12'),
  months           INTEGER NOT NULL CHECK (months BETWEEN 1 AND 24),
  -- plans.member_amount when the prepayment was created. No discount: months x the monthly amount.
  amount_per_month INTEGER NOT NULL CHECK (amount_per_month > 0),
  amount           INTEGER NOT NULL,
  status           TEXT    NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PENDING', 'PAID')),
  created_at       TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  marked_at        TEXT,
  confirmed_at     TEXT,
  confirmed_by     INTEGER REFERENCES users (id),
  CHECK (amount = months * amount_per_month),
  CHECK (end_period >= start_period),
  CHECK (status <> 'PAID' OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL))
) STRICT;

INSERT INTO prepayments (id, code, plan_id, user_id, start_period, end_period, months, amount_per_month, amount, status, created_at, marked_at, confirmed_at, confirmed_by)
SELECT id, code, plan_id, user_id, start_period, end_period, months, amount_per_month, amount, status, created_at, marked_at, confirmed_at, confirmed_by
FROM prepayments_backup;

DROP TABLE prepayments_backup;

CREATE INDEX prepayments_plan_user ON prepayments (plan_id, user_id, start_period);
CREATE INDEX prepayments_user_id ON prepayments (user_id);
CREATE INDEX prepayments_status ON prepayments (status);
CREATE INDEX prepayments_confirmed_by ON prepayments (confirmed_by);
