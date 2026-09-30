import type { Payment, PaymentStatus } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { Skeleton } from "../../../components/Skeleton";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatMoney } from "../../../format";
import { planLogoId } from "./planLogoId";

type PaymentHeaderProps = {
  plan: Payment["plan"];
  // What is being paid ("Kỳ 10/2026", "Trả trước 6 tháng · …"), its amount and status — all null
  // until the row has loaded.
  subtitle: string | null;
  amount: number | null;
  status: PaymentStatus | null;
};

// The plan part can draw before the payment or prepayment loads (from the home card's link state),
// so the logo lands in place while the rest is still a skeleton.
export function PaymentHeader({ plan, subtitle, amount, status }: PaymentHeaderProps) {
  return (
    <header className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <ServiceLogo provider={plan.provider} name={plan.name} layoutId={planLogoId(plan.code)} className="size-14 text-lg" />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight break-words">{plan.name}</h1>
          {subtitle ? (
            <p className="text-on-surface-variant">{subtitle}</p>
          ) : (
            <Skeleton className="mt-1 h-4 w-24" />
          )}
        </div>
      </div>
      {amount !== null && status ? (
        <div className="flex items-end justify-between gap-3">
          <p className="text-5xl font-bold tracking-tight tabular-nums">{formatMoney(amount)}</p>
          <StatusBadge status={status} className="mb-2" />
        </div>
      ) : (
        <Skeleton className="h-12 w-44" />
      )}
    </header>
  );
}
