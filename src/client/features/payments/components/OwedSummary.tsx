import { useTranslation } from "react-i18next";
import { formatMoney } from "../../../format";

// Two plain figures instead of one hero number: what is still to transfer, and what was sent and
// waits for the admin. Each shows only when it is not zero; nothing shows when all is settled.
export function OwedSummary({ unpaid, pending }: { unpaid: number; pending: number }) {
  const { t } = useTranslation();
  if (unpaid === 0 && pending === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-3">
      {unpaid > 0 && (
        <div className="rounded-3xl bg-error-container px-4 py-3 text-on-error-container">
          <dt className="text-sm font-medium">{t("home.toTransfer")}</dt>
          <dd className="text-2xl font-bold tracking-tight tabular-nums">{formatMoney(unpaid)}</dd>
        </div>
      )}
      {pending > 0 && (
        <div className="rounded-3xl bg-warning-container px-4 py-3 text-on-warning-container">
          <dt className="text-sm font-medium">{t("home.awaiting")}</dt>
          <dd className="text-2xl font-bold tracking-tight tabular-nums">{formatMoney(pending)}</dd>
        </div>
      )}
    </dl>
  );
}
