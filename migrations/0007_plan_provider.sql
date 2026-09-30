-- The service a plan is for, so screens can group plans by provider and show its logo.
-- Spec: docs/data-model.md#plans.
--
-- A fixed list: every value has a logo (or a brand colour) in the client. Adding a provider means
-- rebuilding the table in a new migration, like any other enum. Existing plans start as OTHER and
-- the admin sets the right one — nothing is guessed from the plan name.
ALTER TABLE plans ADD COLUMN provider TEXT NOT NULL DEFAULT 'OTHER' CHECK (
  provider IN ('YOUTUBE', 'SPOTIFY', 'NETFLIX', 'APPLE', 'GOOGLE', 'MICROSOFT', 'OPENAI', 'CLAUDE', 'CANVA', 'DUOLINGO', 'NOTION', 'OTHER')
);
