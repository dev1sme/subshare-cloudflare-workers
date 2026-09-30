-- Join requests: a signed-in member asks for a seat in a plan the admin has opened; an admin
-- approves (which creates the seat) or rejects. Spec: docs/data-model.md#xin-vào-gói.
--
-- Accounts are still created by an admin only — there is no public sign-up. A request is not a
-- money row: it never creates a payment by itself, the seat it leads to does (from the next period
-- whose 1st the seat covers).

-- Off by default: an existing plan is not suddenly listed to every member.
ALTER TABLE plans ADD COLUMN accepting_requests INTEGER NOT NULL DEFAULT 0 CHECK (accepting_requests IN (0, 1));

CREATE TABLE join_requests (
  id          INTEGER PRIMARY KEY,
  code        TEXT    NOT NULL UNIQUE CHECK (substr(code, 1, 2) = 'JR'),
  -- A request is not history worth blocking a delete for: it goes with its plan or user. A plan or
  -- user with a seat is still kept by the plan_members FK.
  plan_id     INTEGER NOT NULL REFERENCES plans (id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status      TEXT    NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
  -- The member's message to the admin, optional.
  note        TEXT    CHECK (note IS NULL OR length(note) <= 200),
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  -- Set when an admin approves or rejects (a member cancelling sets decided_at only).
  decided_at  TEXT,
  decided_by  INTEGER REFERENCES users (id),
  -- The seat an approval created.
  member_id   INTEGER REFERENCES plan_members (id),
  CHECK (status = 'PENDING' OR decided_at IS NOT NULL),
  CHECK (status NOT IN ('APPROVED', 'REJECTED') OR decided_by IS NOT NULL),
  CHECK ((status = 'APPROVED') = (member_id IS NOT NULL))
) STRICT;

-- One open request per member per plan; decided ones stay as history. Asking twice (a double tap)
-- violates this -> DUPLICATE_DATA instead of a second row.
CREATE UNIQUE INDEX join_requests_one_pending ON join_requests (plan_id, user_id) WHERE status = 'PENDING';

-- FK lookups (a plan or user delete cascades through these) and the admin's list by status.
CREATE INDEX join_requests_plan_id ON join_requests (plan_id);
CREATE INDEX join_requests_user_id ON join_requests (user_id, created_at);
CREATE INDEX join_requests_status ON join_requests (status, created_at);
CREATE INDEX join_requests_decided_by ON join_requests (decided_by);
CREATE INDEX join_requests_member_id ON join_requests (member_id);
