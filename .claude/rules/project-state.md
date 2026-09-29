# Project state

Nothing is built yet. The repository holds this rules layer, `docs/`, and the README — no `package.json`, no Worker code, no migrations. Nothing is deployed, no D1 database has been created, and no Worker secret has been set.

Decided before any code exists:

- One Worker serves the SPA and `/api/*`; one D1 database. No Pages, no R2, no other bindings.
- Plain SQL against the D1 binding, kept in `src/server/db/` — no ORM.
- No receipt uploads. A member marks a payment as sent; an admin confirms it.
- Deployed to the same Cloudflare account as other Workers, so free-tier quotas are shared (see `platform-limits.md`).

`docs/roadmap.md` is the authoritative backlog.

When something gets built, deployed, or migrated, update this file in the same commit — and state **how it was verified** (a query result, a probe, a `wrangler` output), not just that it was done. "All migrations applied" means `SELECT COUNT(*) FROM d1_migrations` matched the file count, never that the directory looked complete.

No test runner has been chosen yet.
