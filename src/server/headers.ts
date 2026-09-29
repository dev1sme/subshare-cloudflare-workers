import type { MiddlewareHandler } from "hono";

// Security headers for /api/*. The SPA gets its own from public/_headers — assets never reach the Worker.
// Set BEFORE next(): Hono keeps them as prepared headers and merges them into every response,
// including those built by onError / notFound. Set after next(), error responses lose them.
export const securityHeaders: MiddlewareHandler = async (c, next) => {
  c.header("Cache-Control", "no-store");
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'");
  await next();
};
