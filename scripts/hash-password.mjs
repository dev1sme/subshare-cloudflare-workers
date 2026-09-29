#!/usr/bin/env node
// Creates (or resets) an account by printing one SQL statement — nothing is written anywhere.
// Used for the first admin, when the database has no account yet. Spec: docs/auth.md.
//
//   node scripts/hash-password.mjs <email> <display_name> [ADMIN|MEMBER]
//
// The SQL goes to stdout, the generated password to stderr (shown once, never stored).
// Set PASSWORD=... to choose the password instead of generating one.
// Run the SQL with:
//   ./node_modules/.bin/wrangler d1 execute subshare-db --local --command "<sql>"
// The SQL contains a real email — never commit it or paste it into a tracked file.
//
// Imports the Worker's own modules (Node >= 23.6 strips TypeScript types), so the hash
// format and the code shape cannot drift from what the Worker verifies.
import { CODE_PREFIX, generateCode } from "../src/server/domain/code.ts";
import { MIN_PASSWORD_LENGTH, generatePassword, hashPassword } from "../src/server/domain/password.ts";

const [email, displayName, role = "ADMIN"] = process.argv.slice(2);

if (!email || !displayName || !["ADMIN", "MEMBER"].includes(role)) {
  console.error("Usage: node scripts/hash-password.mjs <email> <display_name> [ADMIN|MEMBER]");
  process.exit(1);
}

const password = process.env.PASSWORD ?? generatePassword();
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  process.exit(1);
}

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const passwordHash = await hashPassword(password);

console.log(
  "INSERT INTO users (code, email, display_name, password_hash, role) VALUES (" +
    [generateCode(CODE_PREFIX.user), email, displayName, passwordHash, role].map(quote).join(", ") +
    ") ON CONFLICT (email) DO UPDATE SET password_hash = excluded.password_hash, " +
    "display_name = excluded.display_name, role = excluded.role;",
);
if (!process.env.PASSWORD) console.error(`Password (shown once): ${password}`);
