# API

Spec: `docs/api.md` (surface, behaviour to preserve, SQL safety). Envelope and error-code format: `envelop-conventions.md`. Read both before adding or changing any route under `/api` or touching `src/server/db/`.

Must hold:

- Every route lives under `/api`. Nothing is served from the root except the SPA.
- Handlers never call `c.json` — use `ok` / `failure` / `notFound` from `src/server/envelope.ts`. `grep -rn "c\.json(" src/server/` matches only `envelope.ts`.
- Error codes are UPPER_SNAKE English and are the API contract. Never reword or re-case one. Validation keeps its specific code (`MISSING_PLAN_NAME`) plus `details`, never a blanket `VALIDATION_ERROR`.
- A new user-facing error code needs a key in `src/client/i18n/locales/vi.ts` and `en.ts`.
- Paths address resources by public `code` via `parseCode`, never by numeric id.
- Static sub-paths are registered before `/:code` (Hono matches in order).
- Every value goes through `.bind()`. Never pass a request body into `buildSet` — build the patch field by field. No `...body` in `src/server/`.
- `payments.amount` is not patchable through the member-facing API; payment status is changed only by the transitions in `docs/payments.md`.
- Independent reads for one screen go in one `db.batch()`.
- Every new route picks its guard at its own mount (see `auth.md`).

When the surface changes, update `docs/api.md` in the same commit.
