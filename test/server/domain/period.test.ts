import { describe, expect, it } from "vitest";
import { isIsoDate, todayInVietnam } from "../../../src/server/domain/period";

describe("todayInVietnam", () => {
  it("is already the next day when UTC is still on the previous one", () => {
    // 2026-09-30T17:30Z is 2026-10-01 00:30 in Hanoi (UTC+7).
    expect(todayInVietnam(new Date("2026-09-30T17:30:00Z"))).toBe("2026-10-01");
    expect(todayInVietnam(new Date("2026-09-30T16:59:59Z"))).toBe("2026-09-30");
  });
});

describe("isIsoDate", () => {
  it("accepts real calendar dates only", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    for (const value of ["2026-02-29", "2026-02-30", "2026-13-01", "2026-1-01", "01/10/2026", "2026-10-01T00:00"]) {
      expect(isIsoDate(value), value).toBe(false);
    }
  });
});
