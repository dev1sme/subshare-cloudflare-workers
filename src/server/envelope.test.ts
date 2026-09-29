import { Hono } from "hono";
import { describe, expect, it } from "vitest";
import type { ApiFailure, ApiSuccess } from "../shared/types";
import { failure, handleError, notFound, ok } from "./envelope";
import { securityHeaders } from "./headers";
import { fail, readBody } from "./validate";
import worker from "./index";

function testApp() {
  const app = new Hono();
  app.use(securityHeaders);
  app.onError(handleError);
  app.notFound((c) => notFound(c));
  app.get("/ok", (c) => ok(c, { plans: [] }));
  app.post("/body", async (c) => ok(c, await readBody(c)));
  app.get("/validation", () => fail("MISSING_PLAN_NAME"));
  app.get("/unique", () => {
    throw new Error("D1_ERROR: UNIQUE constraint failed: plans.code: SQLITE_CONSTRAINT");
  });
  app.get("/fk", () => {
    throw new Error("D1_ERROR", { cause: new Error("FOREIGN KEY constraint failed") });
  });
  app.get("/boom", () => {
    throw new Error("secret internals");
  });
  app.get("/bad-code", (c) => failure(c, "bad-code", "nope"));
  return app;
}

describe("envelope", () => {
  it("wraps success with message, data and numeric timestamp", async () => {
    const res = await testApp().request("/ok");
    const body = (await res.json()) as ApiSuccess<{ plans: unknown[] }>;
    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toEqual({ plans: [] });
    expect(typeof body.meta.timestamp).toBe("number");
  });

  it("maps validation errors to 400 with field details", async () => {
    const res = await testApp().request("/validation");
    const body = (await res.json()) as ApiFailure;
    expect(res.status).toBe(400);
    expect(body.error).toEqual({ code: "MISSING_PLAN_NAME", details: { plan_name: ["MISSING_PLAN_NAME"] } });
  });

  it("maps malformed JSON bodies", async () => {
    const res = await testApp().request("/body", { method: "POST", body: "{nope" });
    expect(res.status).toBe(400);
    expect(((await res.json()) as ApiFailure).error.code).toBe("MALFORMED_JSON");
  });

  it("maps D1 constraint failures, including via cause", async () => {
    const unique = await testApp().request("/unique");
    expect(unique.status).toBe(409);
    expect(((await unique.json()) as ApiFailure).error.code).toBe("DUPLICATE_DATA");
    const fk = await testApp().request("/fk");
    expect(fk.status).toBe(409);
    expect(((await fk.json()) as ApiFailure).error.code).toBe("RELATED_DATA_EXISTS");
  });

  it("hides unexpected errors behind INTERNAL_ERROR", async () => {
    const res = await testApp().request("/boom");
    const text = await res.text();
    expect(res.status).toBe(500);
    expect(text).toContain("INTERNAL_ERROR");
    expect(text).not.toContain("secret internals");
  });

  it("answers unknown routes with the NOT_FOUND envelope", async () => {
    const res = await testApp().request("/missing");
    expect(res.status).toBe(404);
    expect(((await res.json()) as ApiFailure).error.code).toBe("NOT_FOUND");
  });

  it("refuses to send a malformed error code", async () => {
    const res = await testApp().request("/bad-code");
    expect(res.status).toBe(500);
  });
});

describe("securityHeaders", () => {
  for (const path of ["/ok", "/validation", "/boom", "/missing"]) {
    it(`sets headers on ${path}`, async () => {
      const res = await testApp().request(path);
      expect(res.headers.get("Cache-Control")).toBe("no-store");
      expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(res.headers.get("Content-Security-Policy")).toContain("default-src 'none'");
    });
  }
});

describe("worker", () => {
  it("serves /api/health through the envelope", async () => {
    const res = await worker.request("/api/health");
    expect(res.status).toBe(200);
    expect(((await res.json()) as ApiSuccess<{ status: string }>).data).toEqual({ status: "ok" });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });
});
