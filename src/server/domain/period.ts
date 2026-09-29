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

const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/;

// The billing period (YYYY-MM) that `now` falls in, in Vietnam time.
export function currentPeriodInVietnam(now: Date = new Date()): string {
  return todayInVietnam(now).slice(0, 7);
}

export function isPeriod(value: string): boolean {
  return PERIOD.test(value);
}

// A period bills every seat present on its first day.
export function firstDayOf(period: string): string {
  return `${period}-01`;
}

// "2026-11" + 3 -> "2027-02". Months may be negative.
export function addMonths(period: string, months: number): string {
  const [year, month] = period.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}
