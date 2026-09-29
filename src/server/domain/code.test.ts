import { describe, expect, it } from "vitest";
import { CODE_PREFIX, generateCode, isCode } from "./code";

describe("codes", () => {
  it("generates prefixed uppercase hex", () => {
    const code = generateCode(CODE_PREFIX.plan);
    expect(code).toMatch(/^PL[0-9A-F]{8}$/);
    expect(isCode(CODE_PREFIX.plan, code)).toBe(true);
  });

  it("rejects the wrong prefix, numeric ids and bad shapes", () => {
    expect(isCode(CODE_PREFIX.payment, "PL3C8EA506")).toBe(false);
    expect(isCode(CODE_PREFIX.payment, "42")).toBe(false);
    expect(isCode(CODE_PREFIX.payment, "PM3c8ea506")).toBe(false);
    expect(isCode(CODE_PREFIX.payment, "PM3C8EA5067")).toBe(false);
  });
});
