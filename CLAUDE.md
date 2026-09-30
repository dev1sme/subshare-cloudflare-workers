# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What the app is

Manager for shared subscriptions (YouTube Premium, Spotify, Netflix…): who is on which plan, who has paid for the current billing period, who still owes. Members see what they owe and a VietQR code to pay; an admin confirms payments.

Scale is deliberately tiny and must stay inside Cloudflare's free tier. **The stack is one Worker + one D1 database, nothing else.** No Pages, no R2, no KV, no Queues, no Durable Objects, no external services. Receipt uploads were dropped on purpose — do not bring them back. Prefer the simplest thing that works.

## Rules — read the matching file before you work

Two layers, **neither loaded automatically** — only this file is:

- `docs/` (Vietnamese) is the system spec: what the system is and **why**. Single source of truth for design reasoning.
- `.claude/rules/` is thin: each topic file names its spec in `docs/` and lists the must-hold rules. The reasoning is never copied into a rule — it lives in the doc.

Read the rule file that matches the task, then the doc it points to, **before** editing, not after. When a change alters behaviour a doc describes, update that doc in the same commit.

| Read this | Spec | Before you |
| --- | --- | --- |
| `.claude/rules/project-state.md` | `docs/roadmap.md` | assume what is built, deployed, or what data exists remotely vs locally |
| `.claude/rules/architecture.md` | `docs/architecture.md` | add a file, move code between layers, touch the Vite/Wrangler build, or write a React hook or page |
| `.claude/rules/ui.md` | `docs/design-system.md` | add a component, a colour, a font, an animation, a toast/dialog, or a screen |
| `.claude/rules/commands.md` | `docs/deployment.md` | run any npm script, wrangler, or a migration |
| `.claude/rules/platform-limits.md` | `docs/deployment.md#hạn-mức-miễn-phí` | add a query, a cron, a subrequest, or anything CPU-heavy |
| `.claude/rules/mcp-servers.md` | — | call a `cloudflare-bindings` or `cloudflare-docs` MCP tool |
| `.claude/rules/data-model.md` | `docs/data-model.md` | write a migration, add a column, or compute money |
| `.claude/rules/api.md` | `docs/api.md` | add or change any route under `/api`, or touch `src/server/db/` |
| `.claude/rules/envelop-conventions.md` | — (is the spec) | change the response envelope, add an error code, or add a response field |
| `.claude/rules/auth.md` | `docs/auth.md` | touch login, sessions, roles, accounts, or password hashing |
| `.claude/rules/security-headers.md` | `docs/security-headers.md` | change `public/_headers`, `src/server/headers.ts`, or CSP |
| `.claude/rules/payments.md` | `docs/payments.md` | touch VietQR, bank details, or payment status |
| `.claude/rules/secrets.md` | `docs/deployment.md#secrets` | add a secret or wonder where one lives |

When you add a rule or doc file, add a row here. A file with no row is a file nobody opens.

## Hard invariants

These are the ones that cost money, break production, or leak data when broken. They are repeated here so they are in context even when nothing else has been opened; the linked doc always has the reasoning.

- **The repository is public.** No token, key, password, email, bank account or any personal identifier in a committed file — including `.dev.vars.example`, docs, rules and comments. → `docs/deployment.md`
- **One Worker, one D1.** No Pages project, no `wrangler pages deploy`, no R2/KV/DO/Queues. → `docs/architecture.md`
- **The Cloudflare account is shared with other Workers.** Free-tier quotas (requests, D1 rows, the 5 Cron Triggers) are per account, not per project. → `docs/deployment.md`
- **Never tune PBKDF2 iterations from a local benchmark.** The dev machine is ~3× faster than a Worker's CPU; free tier allows 10 ms CPU per request. Measure on the deployed Worker. → `docs/auth.md`
- **Plaintext passwords are never stored, logged, or readable back.** A password is returned exactly once, in the response that created it. → `docs/auth.md`
- **A member's share is snapshotted onto `payments` when a period is created.** Never recompute a past period from today's plan price or member list. → `docs/data-model.md`
- **Money is `INTEGER` VND, set by the admin.** No automatic splitting: `plans.price` (what the payer pays, fees included) and `plans.member_amount` (what every member of the plan pays) are entered by hand. A plan's payer (`plans.payer_id`, always an ADMIN) has no seat and no payment row. → `docs/data-model.md`
- **The VietQR payload is built in-house.** Never route it through `img.vietqr.io` or any QR image service — that tells a third party who owes how much. → `docs/payments.md`
- **Handlers never call `c.json` directly.** Go through `ok` / `failure` / `notFound` in `src/server/envelope.ts`. → `docs/api.md`
- **Never pass a request body into `buildSet`.** Column names come from a fixed allowlist at each call site; `...body` would be an injection hole. → `docs/api.md`
- **Error codes are UPPER_SNAKE and are the API contract.** Do not reword or re-case them. → `.claude/rules/envelop-conventions.md`
- **Check remote migrations by querying `d1_migrations`, never by listing the directory.** → `docs/deployment.md`
- **`d1_database_query` hits the REMOTE database.** Reads are fine; any write needs explicit approval first. → `.claude/rules/mcp-servers.md`
- **Identifiers are English.** Functions, variables, hooks, components, types, props, API fields, columns, enums. Vietnamese is UI copy only. → `docs/architecture.md`
- **`npx` does not work here** — a shell hook rewrites it to `npm`. Use an npm script or `./node_modules/.bin/<bin>`. → `.claude/rules/commands.md`
