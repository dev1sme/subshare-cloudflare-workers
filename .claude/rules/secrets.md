# Secrets

Spec: `docs/deployment.md#secrets`. Read it before adding a secret or wondering where one lives.

Must hold:

- **The repository is public.** No token, key, password, email, bank account, chat id, or personal identifier in any committed file — including `.dev.vars.example`, docs, rules, seed migrations and comments.
- Secrets are set with `wrangler secret put`; locally they live in `.dev.vars` (gitignored). `.dev.vars.example` holds names and placeholder values only.
- Every secret name goes in `wrangler.jsonc` `secrets.required`, or it is silently `undefined` in `c.env` during local dev.
- A route that needs an unset secret answers 503 with a specific code, not 401 and not a crash.
- Before claiming a secret is set on the Worker, check `wrangler secret list` — never infer it from `.dev.vars`.
