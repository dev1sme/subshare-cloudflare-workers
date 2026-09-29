// Login name. No email: the app sends no mail, so an email would only be personal data it does not need.
// No imports on purpose: scripts/hash-password.mjs runs this file directly under Node.
// The same shape is enforced by a CHECK constraint on users.username (migrations/0001).

const USERNAME = /^[a-z0-9][a-z0-9._-]{2,31}$/;

// Trimmed and lowercased, so "Minh.Anh " and "minh.anh" are the same account. null = invalid shape.
export function normalizeUsername(raw: string): string | null {
  const username = raw.trim().toLowerCase();
  return USERNAME.test(username) ? username : null;
}
