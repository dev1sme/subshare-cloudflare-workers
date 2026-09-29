import { describe, expect, it } from "vitest";
import { currentPeriodInVietnam, firstDayOf, isIsoDate, isPeriod, todayInVietnam } from "../../../src/server/domain/period";

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

describe("periods", () => {
  it("rolls over to the next month at 00:00 in Hanoi, not at 00:00 UTC", () => {
    expect(currentPeriodInVietnam(new Date("2026-09-30T16:59:59Z"))).toBe("2026-09");
    expect(currentPeriodInVietnam(new Date("2026-09-30T17:00:00Z"))).toBe("2026-10");
    expect(currentPeriodInVietnam(new Date("2026-12-31T17:00:00Z"))).toBe("2027-01");
  });

  it("validates YYYY-MM and gives the first day", () => {
    expect(isPeriod("2026-10")).toBe(true);
    for (const value of ["2026-13", "2026-00", "2026-1", "202610", "2026-10-01"]) expect(isPeriod(value), value).toBe(false);
    expect(firstDayOf("2026-10")).toBe("2026-10-01");
  });
});
