import { describe, expect, it } from "vitest";
import { Where, buildSet } from "./sql";

describe("buildSet", () => {
  it("skips undefined, keeps null", () => {
    expect(buildSet({ name: "Spotify", price: undefined, bank_bin: null })).toEqual({
      clause: "name = ?, bank_bin = ?",
      values: ["Spotify", null],
    });
  });

  it("returns null when nothing is left", () => {
    expect(buildSet({ name: undefined })).toBeNull();
  });

  it("does not accept a request body", () => {
    const body: Record<string, unknown> = { "role = 'ADMIN' --": 1 };
    // @ts-expect-error — unknown values are not SqlValue; this is the compile-time guard.
    buildSet(body);
  });
});

describe("Where", () => {
  it("applies only the filters that are present", () => {
    const where = new Where()
      .add("status = ?", "PENDING")
      .add("user_id = ?", undefined)
      .add("period BETWEEN ? AND ?", "2026-01", "2026-12")
      .add("plan_id = ?", null)
      .addRaw("left_on IS NULL", true)
      .addRaw("confirmed_at IS NULL", false);
    expect(where.clause()).toBe(" WHERE status = ? AND period BETWEEN ? AND ? AND left_on IS NULL");
    expect(where.bindings()).toEqual(["PENDING", "2026-01", "2026-12"]);
  });

  it("skips a range when either bound is missing", () => {
    expect(new Where().add("period BETWEEN ? AND ?", "2026-01", undefined).clause()).toBe("");
  });

  it("throws when placeholders and values disagree", () => {
    expect(() => new Where().add("period BETWEEN ? AND ?", "2026-01")).toThrow(/2 placeholder/);
  });
});
