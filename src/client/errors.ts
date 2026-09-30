import type { TFunction } from "i18next";

const FIELD_PREFIX = /^(MISSING|INVALID|TOO_LONG)_([A-Z0-9_]+)$/;

const PREFIX_KEY = { MISSING: "missing", INVALID: "invalid", TOO_LONG: "tooLong" } as const;

// API error.code -> the sentence shown to the user. A code's own `errors.<CODE>` key wins;
// otherwise MISSING_/INVALID_/TOO_LONG_<FIELD> is phrased from `fields.<field>`
// (see .claude/rules/envelop-conventions.md). Anything else falls back to INTERNAL_ERROR.
export function errorMessage(t: TFunction, code: string): string {
  const own = `errors.${code}`;
  if (t(own, { defaultValue: "" })) return t(own);

  const match = FIELD_PREFIX.exec(code);
  if (match) {
    const field = t(`fields.${match[2].toLowerCase()}`, { defaultValue: "" });
    if (field) return t(`validation.${PREFIX_KEY[match[1] as keyof typeof PREFIX_KEY]}`, { field });
  }
  return t("errors.INTERNAL_ERROR");
}
