// Builds "col = ?, col = ?" for an UPDATE. Column names are interpolated into SQL, so the patch
// must be assembled field by field from a fixed allowlist at the call site — never pass a request
// body (or `...body`) in here.
export function buildSet(patch: Record<string, string | number | null>): { sql: string; values: (string | number | null)[] } {
  const columns = Object.keys(patch);
  if (columns.length === 0) throw new Error("buildSet: empty patch");
  return {
    sql: columns.map((column) => `${column} = ?`).join(", "),
    values: columns.map((column) => patch[column]),
  };
}
