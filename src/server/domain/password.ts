// PBKDF2-SHA256 password hashing on Web Crypto. Spec: docs/auth.md.
// No imports on purpose: scripts/hash-password.mjs runs this file directly under Node.

// Never tune from a local benchmark — the dev machine is ~3x faster than a Worker and
// the free tier allows 10 ms CPU per request. Measure cpuTime on the deployed Worker.
export const PBKDF2_ITERATIONS = 10_000;

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 256;

const SALT_BYTES = 16;
const HASH_BYTES = 32;
const SCHEME = "pbkdf2";
const DIGEST = "sha256";

// Verified when the email is unknown, so a wrong email costs the same as a wrong password.
// The iteration count follows PBKDF2_ITERATIONS: a hard-coded count would make failed logins
// cost a different amount of CPU and reveal which emails exist.
export const DUMMY_PASSWORD_HASH = [
  SCHEME,
  DIGEST,
  PBKDF2_ITERATIONS,
  toBase64(new Uint8Array(SALT_BYTES)),
  toBase64(new Uint8Array(HASH_BYTES)),
].join("$");

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(text: string): Uint8Array {
  const binary = atob(text);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function derive(password: string, salt: Uint8Array, iterations: number, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: salt as BufferSource, iterations },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// Format: pbkdf2$sha256$<iterations>$<salt_b64>$<hash_b64>
export async function hashPassword(password: string, iterations = PBKDF2_ITERATIONS): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, iterations, HASH_BYTES);
  return [SCHEME, DIGEST, iterations, toBase64(salt), toBase64(hash)].join("$");
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 5 || parts[0] !== SCHEME || parts[1] !== DIGEST) return false;
  const iterations = Number(parts[2]);
  if (!Number.isSafeInteger(iterations) || iterations < 1) return false;
  const expected = fromBase64(parts[4]);
  const actual = await derive(password, fromBase64(parts[3]), iterations, expected.length);
  return constantTimeEqual(actual, expected);
}

// No 0/O, 1/l/I: the password is read off a screen and typed once.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export function generatePassword(length = 16): string {
  // Rejection sampling keeps every character equally likely.
  const limit = 256 - (256 % PASSWORD_ALPHABET.length);
  let result = "";
  while (result.length < length) {
    for (const byte of crypto.getRandomValues(new Uint8Array(length))) {
      if (byte < limit && result.length < length) result += PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length];
    }
  }
  return result;
}
