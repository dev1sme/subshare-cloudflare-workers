import { ChevronRight } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Payment } from "../../../../shared/types";
import { PlanAvatar } from "../../../components/PlanAvatar";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatMoney, formatPeriod } from "../../../format";
import { listItem } from "../../../lib/motion";

// The whole row is the link: one large target instead of a small "details" button.
export function PaymentRow({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  return (
    <m.li variants={listItem} layout="position">
      <Link
        to={`/payments/${payment.code}`}
        className="state-layer relative flex min-h-20 cursor-pointer items-center gap-4 overflow-hidden rounded-3xl bg-surface-container-low px-4 py-3 transition-transform duration-200 ease-emphasized active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <PlanAvatar code={payment.plan.code} name={payment.plan.name} />
        {/* Name and amount on the first line, period and status on the second: the badge never
            steals width from the plan name on a phone. */}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate font-semibold">{payment.plan.name}</span>
            <span className="shrink-0 font-bold tabular-nums">{formatMoney(payment.amount)}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-on-surface-variant">
              {t("payments.period", { period: formatPeriod(payment.period) })}
            </span>
            <StatusBadge status={payment.status} />
          </div>
        </div>
        <ChevronRight className="size-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
      </Link>
    </m.li>
  );
}
