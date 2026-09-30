import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Payment } from "../../../../shared/types";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatMoney, formatPeriod } from "../../../format";

// The whole row is the link: one large target instead of a small "details" button.
export function PaymentRow({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  return (
    <li>
      <Link
        to={`/payments/${payment.code}`}
        className="flex min-h-16 cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate font-medium">{payment.plan.name}</span>
          <span className="text-sm text-muted-foreground">
            {t("payments.period", { period: formatPeriod(payment.period) })}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="font-semibold tabular-nums">{formatMoney(payment.amount)}</span>
          <StatusBadge status={payment.status} />
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}
