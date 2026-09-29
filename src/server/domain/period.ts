// Dates and billing periods are computed in Vietnam time. Cron and `new Date()` are UTC:
// 00:30 on the 1st in Hanoi is still the previous month in UTC. Spec: docs/data-model.md.

const TIME_ZONE = "Asia/Ho_Chi_Minh";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

// "en-CA" formats as YYYY-MM-DD.
const dateInVietnam = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function todayInVietnam(now: Date = new Date()): string {
  return dateInVietnam.format(now);
}

// A real calendar date in YYYY-MM-DD form (rejects 2026-02-30).
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
