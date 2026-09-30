import { CalendarRange, ChevronRight, CircleCheck } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Payment, Prepayment } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { StatusBadge } from "../../../components/StatusBadge";
import { Button } from "../../../components/ui/button";
import { formatMoney, formatPeriod } from "../../../format";
import { listItem } from "../../../lib/motion";
import type { MyPlanSummary } from "../useMyPlans";
import { planLogoId } from "./planLogoId";

// One plan the member is in: the service first, then whatever is still open on it.
// `onPrepay` is offered only while the member sits in the plan and has no prepayment under way.
export function MyPlanCard({ summary, onPrepay }: { summary: MyPlanSummary; onPrepay: (summary: MyPlanSummary) => void }) {
  const { t } = useTranslation();
  const { plan, memberAmount, open, paidThrough, prepayments } = summary;
  const canPrepay = memberAmount !== null && prepayments.length === 0;
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
      {open.length + prepayments.length > 0 ? (
        <ul className="border-t border-outline-variant/50">
          {prepayments.map((prepayment) => (
            <PrepaymentRow key={prepayment.code} prepayment={prepayment} />
          ))}
          {open.map((payment) => (
            <OpenPaymentRow key={payment.code} payment={payment} />
          ))}
        </ul>
      ) : paidThrough ? (
        <p className="flex items-center gap-2 border-t border-outline-variant/50 px-4 py-3 text-sm font-medium text-success">
          <CircleCheck className="size-4 shrink-0" aria-hidden="true" />
          {t("home.paidUpTo", { period: formatPeriod(paidThrough) })}
        </p>
      ) : (
        // Just joined: no period has billed this seat yet. Neutral — nothing is paid or owed.
        <p className="border-t border-outline-variant/50 px-4 py-3 text-sm text-on-surface-variant">{t("home.noPeriodYet")}</p>
      )}
      {canPrepay && (
        <div className="flex justify-end border-t border-outline-variant/50 px-2 py-1">
          <Button variant="text" onClick={() => onPrepay(summary)}>
            <CalendarRange aria-hidden="true" />
            {t("prepay.action")}
          </Button>
        </div>
      )}
    </m.li>
  );
}

function OpenPaymentRow({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  return (
    <OpenRow
      to={`/payments/${payment.code}`}
      plan={payment.plan}
      label={t("payments.period", { period: formatPeriod(payment.period) })}
      amount={payment.amount}
      status={payment.status}
    />
  );
}

function PrepaymentRow({ prepayment }: { prepayment: Prepayment }) {
  const { t } = useTranslation();
  return (
    <OpenRow
      to={`/prepayments/${prepayment.code}`}
      plan={prepayment.plan}
      label={t("prepay.range", {
        months: prepayment.months,
        from: formatPeriod(prepayment.start_period),
        to: formatPeriod(prepayment.end_period),
      })}
      amount={prepayment.amount}
      status={prepayment.status}
    />
  );
}

type OpenRowProps = { to: string; plan: Payment["plan"]; label: string; amount: number; status: Payment["status"] };

function OpenRow({ to, plan, label, amount, status }: OpenRowProps) {
  return (
    <li>
      {/* The plan goes along in the link state, so the detail screen draws its header (and the
          logo lands there) before its own request returns. */}
      <Link
        to={to}
        state={{ plan }}
        className="state-layer relative flex min-h-14 cursor-pointer items-center gap-3 overflow-hidden px-4 py-2 focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-primary"
      >
        <span className="flex-1 text-sm">{label}</span>
        <span className="font-bold tabular-nums">{formatMoney(amount)}</span>
        <StatusBadge status={status} />
        <ChevronRight className="size-5 shrink-0 text-on-surface-variant" aria-hidden="true" />
      </Link>
    </li>
  );
}
