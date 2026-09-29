import { Hono } from "hono";
import type { AppEnv } from "./auth";
import { handleError, notFound, ok } from "./envelope";
import { securityHeaders } from "./headers";
import { accountRoutes } from "./routes/accounts";
import { authRoutes } from "./routes/auth";

const app = new Hono<AppEnv>();

// Headers only — not a guard. Guards are picked at each route's own mount.
app.use(securityHeaders);

app.onError(handleError);
app.notFound((c) => notFound(c));

// Unguarded.
app.get("/api/health", (c) => ok(c, { status: "ok" }));

// No guard at the mount: login/logout are public, me/change-password check the session themselves.
app.route("/api/auth", authRoutes);

// requireAdmin, applied inside the sub-app to every route it serves.
app.route("/api/accounts", accountRoutes);

export default app;
