# Project state

The scaffold exists: `package.json`, `wrangler.jsonc`, Vite + React + Tailwind client shell, a Hono Worker with one route (`GET /api/health` → 204). No envelope, no auth, no migrations. Nothing is deployed, no D1 database has been created (`database_id` in `wrangler.jsonc` is an all-zero placeholder), and no Worker secret has been set.

Scaffold verified locally on 2026-09-29: `npm run cf-typegen && npm run typecheck && npm run build` pass; the built `dist/subshare/wrangler.json` carries `run_worker_first: ["/api/*"]` and `not_found_handling: "single-page-application"`; against `npm run dev`, `/api/health` → 204, `/api/nope` → 404 (Worker), `/foo` → 200 `index.html` (SPA fallback).

Decided before any code exists:

- One Worker serves the SPA and `/api/*`; one D1 database. No Pages, no R2, no other bindings.
- Plain SQL against the D1 binding, kept in `src/server/db/` — no ORM.
- No receipt uploads. A member marks a payment as sent; an admin confirms it.
- Deployed to the same Cloudflare account as other Workers, so free-tier quotas are shared (see `platform-limits.md`).

`docs/roadmap.md` is the authoritative backlog.

When something gets built, deployed, or migrated, update this file in the same commit — and state **how it was verified** (a query result, a probe, a `wrangler` output), not just that it was done. "All migrations applied" means `SELECT COUNT(*) FROM d1_migrations` matched the file count, never that the directory looked complete.

Test runner: Vitest 4 with `@cloudflare/vitest-plugin` (`npm run test`, config in `vitest.config.ts`). No tests yet; `passWithNoTests` is on until the first one lands. The plugin requires Vitest `^4.1` — do not bump to Vitest 5 until it supports it.
