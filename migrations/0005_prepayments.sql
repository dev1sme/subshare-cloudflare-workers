-- Prepayments: a member pays 3, 6 or 12 months of one plan at once. Spec: docs/payments.md.
--
-- Members are always billed monthly, whatever plans.cycle says (cycle only describes how the payer
-- pays the provider). A prepayment covers the months start_period..end_period for one seat. Once it
-- is PAID, the payments of those months are PAID and point back to it: existing ones when it is
-- confirmed, later ones when their period is created.
-- The status machine is the payments one: UNPAID -> PENDING (member) -> PAID (admin), and back.

CREATE TABLE prepayments (
  id               INTEGER PRIMARY KEY,
  -- Also the bank transfer note.
  code             TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'PP'),
  plan_id          INTEGER NOT NULL REFERENCES plans (id),
  user_id          INTEGER NOT NULL REFERENCES users (id),
  start_period     TEXT    NOT NULL CHECK (start_period GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]' AND substr(start_period, 6, 2) BETWEEN '01' AND '12'),
  end_period       TEXT    NOT NULL CHECK (end_period GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]' AND substr(end_period, 6, 2) BETWEEN '01' AND '12'),
  months           INTEGER NOT NULL CHECK (months IN (3, 6, 12)),
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

-- Coverage lookups: "which prepayment of this member in this plan covers period X".
CREATE INDEX prepayments_plan_user ON prepayments (plan_id, user_id, start_period);
CREATE INDEX prepayments_user_id ON prepayments (user_id);
CREATE INDEX prepayments_status ON prepayments (status);
CREATE INDEX prepayments_confirmed_by ON prepayments (confirmed_by);

-- The prepayment a PAID payment was settled by; NULL for a payment paid on its own.
ALTER TABLE payments ADD COLUMN prepayment_id INTEGER REFERENCES prepayments (id);
CREATE INDEX payments_prepayment_id ON payments (prepayment_id);
