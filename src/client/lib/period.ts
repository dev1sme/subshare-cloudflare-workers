// Billing periods on the client: "YYYY-MM" in Vietnam time, like the server's domain/period.ts.
const vietnamMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" });

export function currentPeriod(now: Date = new Date()): string {
  return vietnamMonth.format(now).slice(0, 7);
}

// "2026-11" + 3 -> "2027-02". Months may be negative.
export function addMonths(period: string, months: number): string {
  const [year, month] = period.split("-").map(Number);
  const index = year * 12 + (month - 1) + months;
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
}

// The current period and the `count - 1` before it, newest first — the choices of a period filter.
export function recentPeriods(count: number, now: Date = new Date()): string[] {
  const current = currentPeriod(now);
  return Array.from({ length: count }, (_, back) => addMonths(current, -back));
}

// The first period a seat is billed for: a period bills every seat present on its 1st.
export function firstBilledPeriod(joinedOn: string): string {
  const month = joinedOn.slice(0, 7);
  return joinedOn.endsWith("-01") ? month : addMonths(month, 1);
}

const vietnamDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });

// "YYYY-MM-DD" today in Vietnam: the default join / leave date, and the latest one allowed.
export function today(now: Date = new Date()): string {
  return vietnamDay.format(now);
}
