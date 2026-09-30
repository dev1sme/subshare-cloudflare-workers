import { useTranslation } from "react-i18next";
import type { Payment } from "../../../../shared/types";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatMoney, formatPeriod } from "../../../format";

export function PaymentHeader({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold break-words">{payment.plan.name}</h1>
          <p className="text-muted-foreground">{t("payments.period", { period: formatPeriod(payment.period) })}</p>
        </div>
        <StatusBadge status={payment.status} className="mt-1.5" />
      </div>
      <p className="text-3xl font-semibold tabular-nums">{formatMoney(payment.amount)}</p>
    </header>
  );
}
