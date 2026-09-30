import { ChevronRight } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Payment } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatMoney, formatPeriod } from "../../../format";
import { listItem } from "../../../lib/motion";

// A settled payment in the history list. The whole row is the link.
export function PaymentRow({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  return (
    <m.li variants={listItem}>
      <Link
        to={`/payments/${payment.code}`}
        className="state-layer relative flex min-h-16 cursor-pointer items-center gap-3 overflow-hidden rounded-3xl px-3 py-2 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <ServiceLogo provider={payment.plan.provider} name={payment.plan.name} className="size-10 rounded-xl text-sm" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{payment.plan.name}</p>
          <p className="text-sm text-on-surface-variant">{t("payments.period", { period: formatPeriod(payment.period) })}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-sm font-semibold tabular-nums">{formatMoney(payment.amount)}</span>
          <StatusBadge status={payment.status} />
        </div>
        <ChevronRight className="size-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
      </Link>
    </m.li>
  );
}
