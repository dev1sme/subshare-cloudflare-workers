// Public, random, prefixed codes. Ids never appear in URLs. Spec: docs/data-model.md#mã-công-khai-code.
// No imports on purpose: scripts/hash-password.mjs runs this file directly under Node.

export const CODE_PREFIX = {
  user: "AC",
  plan: "PL",
  member: "MB",
  period: "BP",
  payment: "PM",
  prepayment: "PP",
  joinRequest: "JR",
} as const;

export type CodePrefix = (typeof CODE_PREFIX)[keyof typeof CODE_PREFIX];

const CODE_BYTES = 4;
const CODE_BODY = /^[0-9A-F]{8}$/;

// Uppercase hex: no O/I/l, and payments.code is typed into a banking app as the transfer note.
export function generateCode(prefix: CodePrefix): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_BYTES));
  let body = "";
  for (const byte of bytes) body += byte.toString(16).padStart(2, "0");
  return prefix + body.toUpperCase();
}

export function isCode(prefix: CodePrefix, raw: string): boolean {
  return raw.startsWith(prefix) && CODE_BODY.test(raw.slice(prefix.length));
}
