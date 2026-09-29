import { describe, expect, it } from "vitest";
import { normalizeUsername } from "../../../src/server/domain/username";

describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  Minh.Anh ")).toBe("minh.anh");
  });

  it("accepts 3-32 chars of a-z 0-9 . _ - starting with a letter or digit", () => {
    expect(normalizeUsername("abc")).toBe("abc");
    expect(normalizeUsername("a".repeat(32))).toBe("a".repeat(32));
    expect(normalizeUsername("9_x-y.z")).toBe("9_x-y.z");
  });

  it("rejects everything else", () => {
    for (const raw of ["ab", "a".repeat(33), ".abc", "-abc", "a b", "minh@anh", "tên", ""]) {
      expect(normalizeUsername(raw)).toBeNull();
    }
  });
});
