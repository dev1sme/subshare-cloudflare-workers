import { describe, expect, it } from "vitest";
import { ValidationError, fail, requireInteger, requireString, validationDetails } from "../../src/server/validate";

function codeOf(fn: () => unknown): string {
  try {
    fn();
  } catch (err) {
    if (err instanceof ValidationError) return err.code;
    throw err;
  }
  throw new Error("expected a ValidationError");
}

describe("fail", () => {
  it("rejects codes that are not UPPER_SNAKE", () => {
    expect(() => fail("missing_plan_name")).toThrow(/UPPER_SNAKE/);
    expect(() => fail("MISSING-PLAN")).toThrow(/UPPER_SNAKE/);
  });

  it("throws a ValidationError carrying the code", () => {
    expect(codeOf(() => fail("INVALID_PERIOD"))).toBe("INVALID_PERIOD");
  });
});

describe("validationDetails", () => {
  it("keys details by the lowercased field", () => {
    expect(validationDetails("MISSING_PLAN_NAME")).toEqual({ plan_name: ["MISSING_PLAN_NAME"] });
    expect(validationDetails("TOO_LONG_NOTE")).toEqual({ note: ["TOO_LONG_NOTE"] });
  });

  it("returns null for codes that name no field", () => {
    expect(validationDetails("MALFORMED_JSON")).toBeNull();
    expect(validationDetails("DUPLICATE_DATA")).toBeNull();
  });
});

describe("field readers", () => {
  it("builds the code from the field name", () => {
    expect(codeOf(() => requireString({}, "plan_name", 10))).toBe("MISSING_PLAN_NAME");
    expect(codeOf(() => requireString({ plan_name: "  " }, "plan_name", 10))).toBe("MISSING_PLAN_NAME");
    expect(codeOf(() => requireString({ plan_name: 5 }, "plan_name", 10))).toBe("INVALID_PLAN_NAME");
    expect(codeOf(() => requireString({ plan_name: "x".repeat(11) }, "plan_name", 10))).toBe("TOO_LONG_PLAN_NAME");
    expect(requireString({ plan_name: " Spotify " }, "plan_name", 10)).toBe("Spotify");
  });

  it("accepts only safe integers in range", () => {
    expect(codeOf(() => requireInteger({ price: 1.5 }, "price", 0, 100))).toBe("INVALID_PRICE");
    expect(codeOf(() => requireInteger({ price: "10" }, "price", 0, 100))).toBe("INVALID_PRICE");
    expect(codeOf(() => requireInteger({ price: 101 }, "price", 0, 100))).toBe("INVALID_PRICE");
    expect(requireInteger({ price: 100 }, "price", 0, 100)).toBe(100);
  });
});
