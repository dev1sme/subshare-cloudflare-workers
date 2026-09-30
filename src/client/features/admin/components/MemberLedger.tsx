import { Check, ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Payment } from "../../../../shared/types";
import { StatusBadge } from "../../../components/StatusBadge";
import { Button } from "../../../components/ui/button";
import { formatMoney, formatPeriod } from "../../../format";
import { cn } from "../../../lib/cn";
import type { MemberLedger as Ledger } from "../usePlanLedger";

// What a member stands at in this plan, in words: paid up to when, what is owed, what waits.
export function MemberLedgerSummary({ ledger }: { ledger: Ledger }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-0.5 text-sm">
      <p className={ledger.paidThrough ? "font-medium text-success" : "text-on-surface-variant"}>
        {ledger.paidThrough ? t("home.paidUpTo", { period: formatPeriod(ledger.paidThrough) }) : t("memberLedger.nothingPaid")}
      </p>
      {ledger.unpaidCount > 0 && (
        <p className="font-medium text-error">
          {t("memberLedger.owes", { count: ledger.unpaidCount, amount: formatMoney(ledger.unpaidTotal) })}
        </p>
      )}
      {ledger.pendingCount > 0 && <p className="font-medium text-warning">{t("memberLedger.pending", { count: ledger.pendingCount })}</p>}
      {ledger.openPrepayments.map((prepayment) => (
        <p key={prepayment.code} className="text-on-surface-variant">
          {t("memberLedger.openPrepayment", {
            months: prepayment.months,
            from: formatPeriod(prepayment.start_period),
            to: formatPeriod(prepayment.end_period),
            status: t(`status.${prepayment.status}`),
          })}
        </p>
      ))}
    </div>
  );
}

type MemberHistoryProps = {
  ledger: Ledger;
  isBusy: (code: string) => boolean;
  onReceived: (payment: Payment) => void;
};

// Every period of this member in this plan, newest first, behind a disclosure so the list of
// members stays short. An unsettled period not covered by a prepayment can be marked received here.
export function MemberHistory({ ledger, isBusy, onReceived }: MemberHistoryProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (ledger.payments.length === 0 && ledger.prepayments.length === 0) return null;

  return (
    <div className="flex flex-col">
      <Button
        variant="text"
        className="-ml-3 w-fit"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
      >
        <ChevronDown className={cn("transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
        {t("memberLedger.history", { count: ledger.payments.length })}
      </Button>
      {open && (
        <ul id={listId} className="divide-y divide-outline-variant/50 rounded-2xl bg-surface-container">
          {ledger.prepayments.map((prepayment) => (
            <li key={prepayment.code} className="flex min-h-12 items-center gap-3 px-3 py-2 text-sm">
              <span className="flex-1">
                {t("prepay.range", {
                  months: prepayment.months,
                  from: formatPeriod(prepayment.start_period),
                  to: formatPeriod(prepayment.end_period),
                })}
              </span>
              <span className="font-semibold tabular-nums">{formatMoney(prepayment.amount)}</span>
              <StatusBadge status={prepayment.status} />
            </li>
          ))}
          {ledger.payments.map((payment) => (
            <li key={payment.code} className="flex min-h-12 flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm">
              <span className="flex-1">
                {t("payments.period", { period: formatPeriod(payment.period) })}
                {payment.prepayment_code && (
                  <span className="block text-xs text-on-surface-variant">{t("paymentsAdmin.coveredBy", { code: payment.prepayment_code })}</span>
                )}
              </span>
              <span className="font-semibold tabular-nums">{formatMoney(payment.amount)}</span>
              <StatusBadge status={payment.status} />
              {payment.status !== "PAID" && !payment.prepayment_code && (
                <Button variant="tonal" className="ml-auto" disabled={isBusy(payment.code)} onClick={() => onReceived(payment)}>
                  <Check aria-hidden="true" />
                  {t("paymentsAdmin.received")}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
