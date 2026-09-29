# Commands

Spec: `docs/deployment.md`.

The scripts below are the intended surface; they do not exist until the scaffold lands. Keep these names when creating `package.json`.

```bash
npm install
npm run dev                  # Vite + workerd + local D1, one process
npm run build                # tsc -b && vite build -> dist/
npm run deploy               # build + wrangler deploy
npm run typecheck
npm run cf-typegen           # wrangler types — rerun after editing wrangler.jsonc
npm run db:migrate           # apply pending migrations to the LOCAL D1
npm run db:migrate:remote    # apply pending migrations to the REMOTE D1 (needs approval)
```

- **`npx` does not work in this environment** — a shell hook rewrites it and it resolves to `npm`. Always go through an npm script, or call `./node_modules/.bin/wrangler` directly. Cloudflare docs and the README of many templates say `npx wrangler …`; translate, do not copy.
- Deploy with `wrangler deploy`, never `wrangler pages deploy`.
- The generated `worker-configuration.d.ts` is gitignored; a fresh clone runs `npm run cf-typegen` before `npm run typecheck` passes. Never hand-write the `Env` type.
- After `db:migrate:remote`, verify with `SELECT COUNT(*) FROM d1_migrations` against the file count. A `code 7403` ("account is not authorized") failure can be transient — retry once before investigating.
- `npm audit` findings in `undici` via `miniflare`/`wrangler` are local-toolchain only and never ship to the Worker; do not "fix" them by downgrading `@cloudflare/vite-plugin`.
