import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// Storage is isolated per test file, so every file starts from the real schema and no rows.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
