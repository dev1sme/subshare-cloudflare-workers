// Display formatting. Dates are dd/mm/yyyy in both languages (docs/architecture.md), so these do not
// take a locale. Values copied into a banking app use the raw integer, never these strings.

const vnd = new Intl.NumberFormat("vi-VN");

// 120000 -> "120.000 đ"
export function formatMoney(amount: number): string {
  return `${vnd.format(amount)} đ`;
}

// Timestamps are stored in UTC; the calendar day that matters is Vietnam's.
const vietnamDay = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

// "2026-09-30" -> "30/09/2026"; "2026-09-30T18:00:00Z" -> "01/10/2026" (Vietnam time).
// A date-only string is split, not parsed, so it never shifts a day through a time zone.
export function formatDate(iso: string): string {
  const date = iso.length > 10 ? vietnamDay.format(new Date(iso)) : iso;
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
}

// "2026-09" -> "09/2026"
export function formatPeriod(period: string): string {
  const [year, month] = period.split("-");
  return `${month}/${year}`;
}

const vietnamTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", hour12: false });

// "2026-10-02T07:00:00Z" -> "14:00 02/10/2026" (Vietnam time): a deadline to the minute.
export function formatDateTime(iso: string): string {
  return `${vietnamTime.format(new Date(iso))} ${formatDate(iso)}`;
}
