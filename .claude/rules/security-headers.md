# Security headers

Spec: `docs/security-headers.md`. Read it before changing `public/_headers`, `src/server/headers.ts`, CSP, or any inline script in `index.html`.

Must hold:

- Headers live in two places and both are needed: `public/_headers` for the SPA (assets never reach the Worker), `securityHeaders` middleware for `/api/*`.
- `securityHeaders` sets headers before `await next()`; after it, error responses lose them.
- API responses carry `Cache-Control: no-store`.
- `script-src` never contains `'unsafe-inline'`. An inline script (e.g. the pre-paint theme script) is allowed by its sha256; editing it means regenerating the hash.
- HSTS without `preload`.
- Verify with `npm run build && ./node_modules/.bin/vite preview` — `npm run dev` does not serve `_headers`. Watch the `Parsed N valid header rule` count.
