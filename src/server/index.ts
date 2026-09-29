import { Hono } from "hono";
import { handleError, notFound, ok } from "./envelope";
import { securityHeaders } from "./headers";

const app = new Hono<{ Bindings: Env }>();

// Headers only — not a guard. Guards are picked at each route's own mount.
app.use(securityHeaders);

app.onError(handleError);
app.notFound((c) => notFound(c));

app.get("/api/health", (c) => ok(c, { status: "ok" }));

export default app;
