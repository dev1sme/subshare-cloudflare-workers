# MCP servers

`.mcp.json` wires up two Cloudflare MCP servers (streamable HTTP). Use them instead of guessing at API shapes or shelling out to `wrangler` for read-only lookups.

- **`cloudflare-docs`** — no auth. `search_cloudflare_documentation` for anything about Workers, D1, static assets, Cron Triggers, `wrangler.jsonc` fields, free-tier limits. Consult it before inventing config; the docs move faster than model knowledge.
- **`cloudflare-bindings`** — OAuth, account-scoped (run `/mcp` to authenticate if a call fails with an auth error). Relevant tools: `d1_databases_list`, `d1_database_create`, `d1_database_get`, `d1_database_query`, `workers_list`, `workers_get_worker`, `workers_get_worker_code`. KV / R2 / Hyperdrive tools exist too but this project does not use those bindings — do not provision them.

Rules of use:

- **The account holds other Workers and databases.** Always target this project's database by name; never query, migrate or modify a database or Worker that is not this project's.
- `d1_database_query` hits the **remote** D1 instance, not the local dev one. Reads (`SELECT`, `PRAGMA table_info`) are fine unprompted; anything that writes (`INSERT`/`UPDATE`/`DELETE`/`DROP`, running a migration) needs explicit approval first, same as any destructive operation.
- Local development goes through `./node_modules/.bin/wrangler d1 execute <db> --local`. MCP is for inspecting and operating the deployed environment.
- `d1_database_create` is how the database gets created; take the returned `database_id` and paste it into `wrangler.jsonc`.
- MCP servers may be unavailable in headless/CI runs — never make a build or migration step depend on them.
