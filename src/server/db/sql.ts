/** A value D1 can bind. Anything else (objects, arrays, booleans) is a bug at the call site. */
export type SqlValue = string | number | null;

/**
 * Builds `SET col = ?` fragments for a partial update. `undefined` values are skipped;
 * `null` is a real value (sets the column to NULL). Returns null when nothing is left.
 *
 * Column names are interpolated, so they come from a fixed allowlist at each call site — never
 * from request data. The value type enforces it: a request body is `Record<string, unknown>`,
 * which does not compile here.
 */
export function buildSet<C extends string>(
  patch: Partial<Record<C, SqlValue>>,
): { clause: string; values: SqlValue[] } | null {
  const entries = (Object.entries(patch) as [C, SqlValue | undefined][]).filter(
    (entry): entry is [C, SqlValue] => entry[1] !== undefined,
  );
  if (entries.length === 0) return null;

  return {
    clause: entries.map(([column]) => `${column} = ?`).join(", "),
    values: entries.map(([, value]) => value),
  };
}

/**
 * Collects `WHERE` conditions for optional filters. A condition is applied only when every one of
 * its values is present (not undefined/null) — to filter on NULL itself, use `addRaw`.
 * Conditions are SQL written at the call site, never request data.
 */
export class Where {
  private readonly conditions: string[] = [];
  private readonly values: SqlValue[] = [];

  /** e.g. `add("status = ?", status)`, `add("period BETWEEN ? AND ?", from, to)`. */
  add(condition: string, ...values: (SqlValue | undefined)[]): this {
    const placeholders = condition.split("?").length - 1;
    if (placeholders !== values.length) {
      throw new Error(`Where.add: ${placeholders} placeholder(s) but ${values.length} value(s) in "${condition}"`);
    }
    if (values.every((value): value is string | number => value !== undefined && value !== null)) {
      this.conditions.push(condition);
      this.values.push(...values);
    }
    return this;
  }

  /** Condition with no bound value, e.g. `left_on IS NULL`. */
  addRaw(condition: string, enabled: boolean): this {
    if (enabled) this.conditions.push(condition);
    return this;
  }

  clause(): string {
    return this.conditions.length === 0 ? "" : ` WHERE ${this.conditions.join(" AND ")}`;
  }

  bindings(): SqlValue[] {
    return this.values;
  }
}
