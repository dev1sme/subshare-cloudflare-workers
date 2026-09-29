# Auth

Spec: `docs/auth.md`. Read it before touching login, sessions, roles, accounts, or password hashing.

Must hold:

- **Never tune PBKDF2 iterations from a local benchmark.** Start at 10,000 and re-measure `cpuTime` with `wrangler tail --format json` on the deployed Worker, with probes spaced ~2 s apart. The dev machine is ~3× faster than a Worker.
- The dummy record used for unknown usernames interpolates its iteration count from `PBKDF2_ITERATIONS`; never hard-code it.
- Plaintext passwords are never stored, logged, or readable back. Returned exactly once in the create/reset response. No "view password" feature, ever.
- Session is a JWT in an `httpOnly`, `secure`, `sameSite=Lax` cookie. Never in `localStorage`, never in a URL.
- One middleware per role (`requireAdmin`, `requireMember`); no role-agnostic `requireAuth`. Every mount carries its own guard; no `/api/*` wildcard middleware.
- `/api/me/*` takes the user from the token, never the request; another member's resource is 404, not 403.
- Self-service change-password requires the current password; admin reset does not.
- Web Crypto (`crypto.subtle`, `crypto.getRandomValues`) and constant-time compare only — never `Math.random()` for anything security-related. No session table. No rate limiting (would need KV/DO).
