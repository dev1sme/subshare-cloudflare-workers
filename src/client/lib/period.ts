// Billing periods on the client: "YYYY-MM" in Vietnam time, like the server's domain/period.ts.
const vietnamMonth = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit" });

export function currentPeriod(now: Date = new Date()): string {
  return vietnamMonth.format(now).slice(0, 7);
}

// The current period and the `count - 1` before it, newest first — the choices of a period filter.
export function recentPeriods(count: number, now: Date = new Date()): string[] {
  const [year, month] = currentPeriod(now).split("-").map(Number);
  return Array.from({ length: count }, (_, back) => {
    const index = year * 12 + (month - 1) - back;
    return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, "0")}`;
  });
}

const vietnamDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "2-digit", day: "2-digit" });

// "YYYY-MM-DD" today in Vietnam: the default join / leave date, and the latest one allowed.
export function today(now: Date = new Date()): string {
  return vietnamDay.format(now);
}
