import { ChevronRight, CircleCheck } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Payment } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { StatusBadge } from "../../../components/StatusBadge";
import { formatMoney, formatPeriod } from "../../../format";
import { listItem } from "../../../lib/motion";
import type { MyPlanSummary } from "../useMyPlans";
import { planLogoId } from "./planLogoId";

// One plan the member is in: the service first, then whatever is still open on it.
export function MyPlanCard({ summary }: { summary: MyPlanSummary }) {
  const { t } = useTranslation();
  const { plan, memberAmount, open, lastPaid } = summary;
  return (
    <m.li variants={listItem} className="overflow-hidden rounded-card bg-surface-container-low">
      <div className="flex items-center gap-4 p-4">
        <ServiceLogo provider={plan.provider} name={plan.name} layoutId={planLogoId(plan.code)} />
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-bold">{plan.name}</h2>
          <p className="text-sm text-on-surface-variant tabular-nums">
            {memberAmount === null ? t("home.left") : t("explore.perMonth", { amount: formatMoney(memberAmount) })}
          </p>
        </div>
      </div>
      {open.length > 0 ? (
        <ul className="border-t border-outline-variant/50">
          {open.map((payment) => (
            <OpenPaymentRow key={payment.code} payment={payment} />
          ))}
        </ul>
      ) : lastPaid ? (
        <p className="flex items-center gap-2 border-t border-outline-variant/50 px-4 py-3 text-sm font-medium text-success">
          <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
          {t("home.paidUpTo", { period: formatPeriod(lastPaid.period) })}
        </p>
      ) : (
        // Just joined: no period has billed this seat yet. Neutral — nothing is paid or owed.
        <p className="border-t border-outline-variant/50 px-4 py-3 text-sm text-on-surface-variant">{t("home.noPeriodYet")}</p>
      )}
    </m.li>
  );
}

function OpenPaymentRow({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  return (
    <li>
      {/* The plan goes along in the link state, so the detail screen draws its header (and the
          logo lands there) before its own request returns. */}
      <Link
        to={`/payments/${payment.code}`}
        state={{ plan: payment.plan }}
        className="state-layer relative flex min-h-14 cursor-pointer items-center gap-3 overflow-hidden px-4 py-2 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary"
      >
        <span className="flex-1 text-sm">{t("payments.period", { period: formatPeriod(payment.period) })}</span>
        <span className="font-bold tabular-nums">{formatMoney(payment.amount)}</span>
        <StatusBadge status={payment.status} />
        <ChevronRight className="size-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
      </Link>
    </li>
  );
}
