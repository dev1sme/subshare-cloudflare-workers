import { Check, Undo2 } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "../../../components/UserAvatar";
import { Button } from "../../../components/ui/button";
import { formatDate, formatMoney, formatPeriod } from "../../../format";
import { spring } from "../../../lib/motion";
import type { PaymentsView, ReviewItem } from "../useAdminPayments";

type ReviewRowProps = {
  item: ReviewItem;
  view: PaymentsView;
  // A request for this row is in flight.
  busy: boolean;
  onConfirm: (item: ReviewItem) => void;
  onRevert: (item: ReviewItem) => void;
};

// One member's money row inside its plan's group: who, which period, how much, and the one or two
// moves the view allows (docs/payments.md). Enters from below, leaves sideways once moved.
export function ReviewRow({ item, view, busy, onConfirm, onRevert }: ReviewRowProps) {
  const { t } = useTranslation();
  const { row } = item;
  const what =
    item.kind === "payment"
      ? t("payments.period", { period: formatPeriod(item.row.period) })
      : t("paymentsAdmin.prepaid", {
          months: item.row.months,
          from: formatPeriod(item.row.start_period),
          to: formatPeriod(item.row.end_period),
        });
  // A payment settled by a prepayment only moves with that prepayment.
  const coveredBy = item.kind === "payment" ? item.row.prepayment_code : null;

  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: spring }}
      exit={{ opacity: 0, x: 80, transition: { duration: 0.2, ease: [0.3, 0, 0.8, 0.15] } }}
      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center"
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <UserAvatar name={row.user.display_name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-bold">{row.user.display_name}</p>
            <p className="shrink-0 font-bold tabular-nums">{formatMoney(row.amount)}</p>
          </div>
          <p className="truncate text-sm text-on-surface-variant">{what}</p>
          {view === "pending" && row.marked_at && (
            <p className="text-xs text-on-surface-variant">{t("paymentsAdmin.reportedOn", { date: formatDate(row.marked_at) })}</p>
          )}
          {view === "paid" && (
            <p className="text-xs text-on-surface-variant">
              {coveredBy
                ? t("paymentsAdmin.coveredBy", { code: coveredBy })
                : row.confirmed_at && t("paymentsAdmin.confirmedOn", { date: formatDate(row.confirmed_at) })}
            </p>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {view === "pending" && (
          <>
            <Button variant="text" disabled={busy} onClick={() => onRevert(item)}>
              <Undo2 aria-hidden="true" />
              {t("paymentsAdmin.sendBack")}
            </Button>
            <Button disabled={busy} onClick={() => onConfirm(item)}>
              <Check aria-hidden="true" />
              {t("paymentsAdmin.confirm")}
            </Button>
          </>
        )}
        {view === "unpaid" && (
          <Button variant="tonal" disabled={busy} onClick={() => onConfirm(item)}>
            <Check aria-hidden="true" />
            {t("paymentsAdmin.received")}
          </Button>
        )}
        {view === "paid" && !coveredBy && (
          <Button variant="text" disabled={busy} onClick={() => onRevert(item)}>
            <Undo2 aria-hidden="true" />
            {t("paymentsAdmin.undo")}
          </Button>
        )}
      </div>
    </m.li>
  );
}
