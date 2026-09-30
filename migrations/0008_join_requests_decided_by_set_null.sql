-- join_requests.decided_by now lets its admin be deleted. Spec: docs/data-model.md#xin-vào-gói.
--
-- 0006 declared decided_by REFERENCES users (id) with no ON DELETE action, so an admin who had
-- ever approved or rejected a request could never be deleted (RELATED_DATA_EXISTS) — against that
-- migration's own rule that a request is not history worth blocking a delete for. The column
-- becomes ON DELETE SET NULL, and the CHECK that required it for APPROVED / REJECTED goes: the app
-- still always sets it, but a deleted admin leaves "decided, by someone no longer here".
--
-- SQLite cannot change a foreign key in place: rebuild the table in the order D1 allows
-- (backup -> drop -> create under the final name -> copy back), as in 0003. Nothing references
-- join_requests, so no child rows are involved.
PRAGMA defer_foreign_keys = true;

CREATE TABLE join_requests_backup AS SELECT * FROM join_requests;
DROP TABLE join_requests;

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
  -- The deciding admin; NULL once that admin's account is deleted.
  decided_by  INTEGER REFERENCES users (id) ON DELETE SET NULL,
  -- The seat an approval created.
  member_id   INTEGER REFERENCES plan_members (id),
  CHECK (status = 'PENDING' OR decided_at IS NOT NULL),
  CHECK ((status = 'APPROVED') = (member_id IS NOT NULL))
) STRICT;

INSERT INTO join_requests (id, code, plan_id, user_id, status, note, created_at, decided_at, decided_by, member_id)
SELECT id, code, plan_id, user_id, status, note, created_at, decided_at, decided_by, member_id FROM join_requests_backup;

DROP TABLE join_requests_backup;

-- Same indexes as 0006.
CREATE UNIQUE INDEX join_requests_one_pending ON join_requests (plan_id, user_id) WHERE status = 'PENDING';
CREATE INDEX join_requests_plan_id ON join_requests (plan_id);
CREATE INDEX join_requests_user_id ON join_requests (user_id, created_at);
CREATE INDEX join_requests_status ON join_requests (status, created_at);
CREATE INDEX join_requests_decided_by ON join_requests (decided_by);
CREATE INDEX join_requests_member_id ON join_requests (member_id);
