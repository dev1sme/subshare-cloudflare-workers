import { Hono } from "hono";

const app = new Hono<{ Bindings: Env }>();

// Liveness probe. No body until the response envelope lands (src/server/envelope.ts).
app.get("/api/health", (c) => c.body(null, 204));

export default app;
