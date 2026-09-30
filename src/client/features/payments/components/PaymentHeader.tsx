import { useTranslation } from "react-i18next";
import type { Payment } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { Skeleton } from "../../../components/Skeleton";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatMoney, formatPeriod } from "../../../format";
import { planLogoId } from "./planLogoId";

// The plan part can draw before the payment loads (from the home card's link state), so the logo
// lands in place while the rest is still a skeleton.
export function PaymentHeader({ plan, payment }: { plan: Payment["plan"]; payment: Payment | null }) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <ServiceLogo provider={plan.provider} name={plan.name} layoutId={planLogoId(plan.code)} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight break-words">{plan.name}</h1>
          {payment ? (
            <p className="text-on-surface-variant">{t("payments.period", { period: formatPeriod(payment.period) })}</p>
          ) : (
            <Skeleton className="mt-1 h-4 w-24" />
          )}
        </div>
      </div>
      {payment ? (
        <div className="flex items-end justify-between gap-3">
          <p className="text-5xl font-bold tracking-tight tabular-nums">{formatMoney(payment.amount)}</p>
          <StatusBadge status={payment.status} className="mb-2" />
        </div>
      ) : (
        <Skeleton className="h-12 w-44" />
      )}
    </header>
  );
}
