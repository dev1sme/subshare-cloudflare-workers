import { Hono } from "hono";
import type { AppEnv } from "./auth";
import { handleError, notFound, ok } from "./envelope";
import { securityHeaders } from "./headers";
import { accountRoutes } from "./routes/accounts";
import { authRoutes } from "./routes/auth";
import { joinRequestRoutes } from "./routes/joinRequests";
import { meRoutes } from "./routes/me";
import { memberRoutes } from "./routes/members";
import { paymentRoutes } from "./routes/payments";
import { planRoutes } from "./routes/plans";
import { prepaymentRoutes } from "./routes/prepayments";
import { createDuePeriods } from "./scheduled";

export const app = new Hono<AppEnv>();

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

// requireAdmin, applied inside the sub-app.
app.route("/api/plans", planRoutes);

// requireAdmin, applied inside the sub-app.
app.route("/api/members", memberRoutes);

// requireAdmin, applied inside the sub-app.
app.route("/api/payments", paymentRoutes);

// requireAdmin, applied inside the sub-app.
app.route("/api/prepayments", prepaymentRoutes);

// requireAdmin, applied inside the sub-app. Members ask through /api/me/join-requests.
app.route("/api/join-requests", joinRequestRoutes);

// requireMember, applied inside the sub-app. The user comes from the token only.
app.route("/api/me", meRoutes);

export default {
  fetch: app.fetch,
  // One Cron Trigger for every recurring job (the account's 5 triggers are shared).
  scheduled(controller, env, ctx) {
    ctx.waitUntil(createDuePeriods(env.DB, new Date(controller.scheduledTime)));
  },
} satisfies ExportedHandler<Env>;
