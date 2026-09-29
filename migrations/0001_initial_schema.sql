-- Initial schema. Spec: docs/data-model.md.
-- Once applied anywhere this file is never edited; changes go in a new migration.
--
-- Conventions:
--   * Money is INTEGER VND. Dates/times are ISO TEXT (UTC timestamps, `period` is YYYY-MM in Asia/Ho_Chi_Minh).
--   * Every URL-addressable table has a random, prefixed `code`; ids never leave the server.
--   * Enums are CHECK-constrained UPPER_SNAKE — changing one means rebuilding the table.
--   * FKs have no ON DELETE action: deleting a parent that still has rows fails (409 RELATED_DATA_EXISTS).
--   * Every FK column is indexed, so the FK check on delete does not scan the child table.
--   * STRICT tables: a wrong type is rejected instead of silently stored.
--   * No real data here — the repository is public. The first admin is created with scripts/hash-password.mjs.

CREATE TABLE users (
  id            INTEGER PRIMARY KEY,
  code          TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'AC'),
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  display_name  TEXT    NOT NULL,
  -- pbkdf2$sha256$<iterations>$<salt_b64>$<hash_b64> (docs/auth.md)
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'MEMBER' CHECK (role IN ('ADMIN', 'MEMBER')),
  created_at    TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
) STRICT;

CREATE TABLE plans (
  id                INTEGER PRIMARY KEY,
  code              TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'PL'),
  name              TEXT    NOT NULL,
  price             INTEGER NOT NULL CHECK (price > 0),
  cycle             TEXT    NOT NULL CHECK (cycle IN ('MONTHLY', 'YEARLY')),
  max_slots         INTEGER NOT NULL CHECK (max_slots >= 1),
  split_mode        TEXT    NOT NULL DEFAULT 'EQUAL' CHECK (split_mode IN ('EQUAL', 'CUSTOM')),
  -- Bank details are data entered through the UI, never committed (docs/payments.md). NULL = not set.
  bank_bin          TEXT,
  bank_account_no   TEXT,
  bank_account_name TEXT,
  active            INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at        TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
) STRICT;

CREATE TABLE plan_members (
  id        INTEGER PRIMARY KEY,
  code      TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'MB'),
  plan_id   INTEGER NOT NULL REFERENCES plans (id),
  user_id   INTEGER NOT NULL REFERENCES users (id),
  -- Used by split_mode = CUSTOM; ignored by EQUAL.
  weight    INTEGER NOT NULL DEFAULT 1 CHECK (weight >= 1),
  joined_on TEXT    NOT NULL,
  -- Leaving sets left_on; the row stays as history and is never deleted.
  left_on   TEXT,
  CHECK (left_on IS NULL OR left_on >= joined_on)
) STRICT;

-- One active seat per user per plan; past seats are kept.
CREATE UNIQUE INDEX plan_members_active_unique ON plan_members (plan_id, user_id) WHERE left_on IS NULL;
CREATE INDEX plan_members_plan_id ON plan_members (plan_id);
CREATE INDEX plan_members_user_id ON plan_members (user_id);

CREATE TABLE billing_periods (
  id         INTEGER PRIMARY KEY,
  code       TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'BP'),
  plan_id    INTEGER NOT NULL REFERENCES plans (id),
  period     TEXT    NOT NULL CHECK (period GLOB '[0-9][0-9][0-9][0-9]-[01][0-9]' AND substr(period, 6, 2) BETWEEN '01' AND '12'),
  -- Snapshot of plans.price when the period was created. Never recomputed.
  price      INTEGER NOT NULL CHECK (price > 0),
  created_at TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- Creating a period twice (cron retry, double click) is INSERT ... ON CONFLICT DO NOTHING.
  UNIQUE (plan_id, period)
) STRICT;

-- Range filters over all plans (period BETWEEN ? AND ?) for statistics.
CREATE INDEX billing_periods_period ON billing_periods (period);

CREATE TABLE payments (
  id                INTEGER PRIMARY KEY,
  -- Also the bank transfer note: short and retypeable.
  code              TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'PM'),
  billing_period_id INTEGER NOT NULL REFERENCES billing_periods (id),
  user_id           INTEGER NOT NULL REFERENCES users (id),
  -- Snapshot of the member's share when the period was created. Never recomputed.
  amount            INTEGER NOT NULL CHECK (amount >= 0),
  status            TEXT    NOT NULL DEFAULT 'UNPAID' CHECK (status IN ('UNPAID', 'PENDING', 'PAID')),
  -- Set when the member reports the transfer (UNPAID -> PENDING).
  marked_at         TEXT,
  -- Set when an admin confirms (-> PAID); cleared on revert.
  confirmed_at      TEXT,
  confirmed_by      INTEGER REFERENCES users (id),
  UNIQUE (billing_period_id, user_id),
  CHECK (status <> 'PAID' OR (confirmed_at IS NOT NULL AND confirmed_by IS NOT NULL))
) STRICT;

CREATE INDEX payments_user_id ON payments (user_id);
CREATE INDEX payments_status ON payments (status);
CREATE INDEX payments_confirmed_by ON payments (confirmed_by);
