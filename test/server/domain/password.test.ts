import { describe, expect, it } from "vitest";
import { DUMMY_PASSWORD_HASH, PBKDF2_ITERATIONS, generatePassword, hashPassword, verifyPassword } from "../../../src/server/domain/password";

describe("password hashing", () => {
  it("round-trips and rejects a wrong password", async () => {
    const stored = await hashPassword("correct horse");
    expect(stored).toMatch(/^pbkdf2\$sha256\$10000\$[A-Za-z0-9+/=]+\$[A-Za-z0-9+/=]+$/);
    expect(await verifyPassword("correct horse", stored)).toBe(true);
    expect(await verifyPassword("correct horsE", stored)).toBe(false);
  });

  it("salts every hash", async () => {
    expect(await hashPassword("same")).not.toBe(await hashPassword("same"));
  });

  it("reads the iteration count from the record", async () => {
    const stored = await hashPassword("pw-12345", 1_000);
    expect(stored.split("$")[2]).toBe("1000");
    expect(await verifyPassword("pw-12345", stored)).toBe(true);
  });

  it("rejects malformed records instead of throwing", async () => {
    expect(await verifyPassword("x", "plain-text")).toBe(false);
    expect(await verifyPassword("x", "pbkdf2$sha1$10000$AAAA$AAAA")).toBe(false);
  });

  it("derives the dummy record's cost from PBKDF2_ITERATIONS", async () => {
    expect(DUMMY_PASSWORD_HASH.split("$")[2]).toBe(String(PBKDF2_ITERATIONS));
    expect(await verifyPassword("anything", DUMMY_PASSWORD_HASH)).toBe(false);
  });

  it("generates unambiguous passwords of the requested length", () => {
    const password = generatePassword(32);
    expect(password).toHaveLength(32);
    expect(password).not.toMatch(/[01OIl]/);
  });
});
