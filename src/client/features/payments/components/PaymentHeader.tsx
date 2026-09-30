import { useTranslation } from "react-i18next";
import type { Payment } from "../../../../shared/types";
import { PlanAvatar } from "../../../components/PlanAvatar";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatMoney, formatPeriod } from "../../../format";

export function PaymentHeader({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <PlanAvatar code={payment.plan.code} name={payment.plan.name} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight break-words">{payment.plan.name}</h1>
          <p className="text-on-surface-variant">{t("payments.period", { period: formatPeriod(payment.period) })}</p>
        </div>
      </div>
      <div className="flex items-end justify-between gap-3">
        <p className="text-5xl font-bold tracking-tight tabular-nums">{formatMoney(payment.amount)}</p>
        <StatusBadge status={payment.status} className="mb-2" />
      </div>
    </header>
  );
}
