-- Plan wishes: a member asks for a plan of some service to be opened — one that is full, or that
-- has no plan at all. When enough members want the same service, an admin opens a plan from their
-- wishes; the wishers are told in the app and get a 48-hour head start to ask to join.
-- Spec: docs/data-model.md#yêu-cầu-mở-gói.
--
-- Not a money row: a wish creates nothing billable. Joining still goes through join_requests.

-- End of the head start of a plan opened from wishes (UTC ISO). NULL = no head start.
ALTER TABLE plans ADD COLUMN priority_until TEXT;

CREATE TABLE plan_wishes (
  id           INTEGER PRIMARY KEY,
  code         TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'PW'),
  -- A wish is not history worth blocking an account delete for.
  user_id      INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  provider     TEXT    NOT NULL CHECK (
    provider IN ('YOUTUBE', 'SPOTIFY', 'NETFLIX', 'APPLE', 'GOOGLE', 'MICROSOFT', 'OPENAI', 'CLAUDE', 'CANVA', 'DUOLINGO', 'NOTION', 'OTHER')
  ),
  -- The service's name as typed, only for OTHER (a listed provider is named by the provider).
  service_name TEXT    CHECK (service_name IS NULL OR length(service_name) BETWEEN 1 AND 64),
  -- What groups wishes for the same service: '' for a listed provider, the trimmed lowercase name
  -- for OTHER ("Coursera" and " coursera" are one service). Set by the app.
  service_key  TEXT    NOT NULL DEFAULT '',
  note         TEXT    CHECK (note IS NULL OR length(note) <= 200),
  -- OPEN -> FULFILLED (a plan was opened from it) | CANCELLED (the member) | DECLINED (an admin).
  status       TEXT    NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'FULFILLED', 'CANCELLED', 'DECLINED')),
  -- The plan opened for it; NULL again if that plan is later deleted.
  plan_id      INTEGER REFERENCES plans (id) ON DELETE SET NULL,
  created_at   TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  decided_at   TEXT,
  -- When the member dismissed the "your plan is open" notice.
  seen_at      TEXT,
  CHECK ((provider = 'OTHER') = (service_name IS NOT NULL)),
  CHECK ((provider = 'OTHER') = (service_key <> '')),
  CHECK (status = 'OPEN' OR decided_at IS NOT NULL)
) STRICT;

-- One open wish per member per service; a double tap violates this instead of adding a row.
CREATE UNIQUE INDEX plan_wishes_one_open ON plan_wishes (user_id, provider, service_key) WHERE status = 'OPEN';
-- The admin's list and the "others waiting" count, both by status and service.
CREATE INDEX plan_wishes_status ON plan_wishes (status, provider, service_key);
-- A member's own list, and the FK lookups.
CREATE INDEX plan_wishes_user_id ON plan_wishes (user_id, created_at);
CREATE INDEX plan_wishes_plan_id ON plan_wishes (plan_id);
