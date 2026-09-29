import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

const migrations = await readD1Migrations("./migrations");

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          // Test-only value; the real secret lives in .dev.vars / `wrangler secret put`.
          JWT_SECRET: "test-only-jwt-secret",
          TEST_MIGRATIONS: migrations,
        },
      },
    }),
  ],
  test: {
    setupFiles: ["./test/apply-migrations.ts"],
  },
});
