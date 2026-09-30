import { AnimatePresence } from "motion/react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../components/EmptyState";
import { LoadError } from "../../components/LoadError";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { Skeleton } from "../../components/Skeleton";
import { SelectField } from "../../components/ui/select-field";
import { useConfirm } from "../../hooks/useConfirm";
import { formatMoney, formatPeriod } from "../../format";
import { currentPeriod, recentPeriods } from "../../lib/period";
import { PaymentPlanGroup } from "./components/PaymentPlanGroup";
import { ReviewRow } from "./components/ReviewRow";
import { type PaymentsView, type ReviewItem, useAdminPayments } from "./useAdminPayments";

export default function AdminPaymentsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  // Screen state: which view, and the period the unpaid / paid views look at.
  const [view, setView] = useState<PaymentsView>("pending");
  const [period, setPeriod] = useState(currentPeriod);
  const periods = useMemo(() => recentPeriods(12), []);
  const { items, total, error, loading, reload, busy, setStatus, revertPrepayment } = useAdminPayments(view, period);
  // Grouped by plan, keeping the order rows came in (oldest report first / the API's order).
  const groups = useMemo(() => {
    const byPlan = new Map<string, ReviewItem[]>();
    for (const item of items) byPlan.set(item.row.plan.code, [...(byPlan.get(item.row.plan.code) ?? []), item]);
    return [...byPlan.values()];
  }, [items]);

  const revert = async (item: ReviewItem) => {
    const key = view === "pending" ? "sendBack" : "undo";
    const confirmed = await confirm({
      title: t(`paymentsAdmin.${key}Title`, { user: item.row.user.display_name, amount: formatMoney(item.row.amount) }),
      description: t(`paymentsAdmin.${key}Body`),
      destructive: true,
      confirmLabel: t(`paymentsAdmin.${key}`),
    });
    if (confirmed) await setStatus(item, "UNPAID");
  };

  const undoPrepayment = async (prepaymentCode: string, item: ReviewItem) => {
    const user = item.row.user.display_name;
    const confirmed = await confirm({
      title: t("paymentsAdmin.undoPrepaymentTitle", { code: prepaymentCode, user }),
      description: t("paymentsAdmin.undoPrepaymentBody"),
      destructive: true,
      confirmLabel: t("paymentsAdmin.undoPrepayment"),
    });
    if (confirmed) await revertPrepayment(prepaymentCode, user);
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-3xl font-bold tracking-tight">{t("nav.payments")}</h1>
      <SegmentedTabs
        label={t("paymentsAdmin.views")}
        layoutId="admin-payments-view"
        value={view}
        onChange={setView}
        segments={[
          { value: "pending", label: t("paymentsAdmin.pending") },
          { value: "unpaid", label: t("paymentsAdmin.unpaid") },
          { value: "paid", label: t("paymentsAdmin.paid") },
        ]}
      />
      {view !== "pending" && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SelectField label={t("paymentsAdmin.period")} value={period} onChange={(event) => setPeriod(event.target.value)} className="sm:w-56">
            {periods.map((option) => (
              <option key={option} value={option}>
                {formatPeriod(option)}
              </option>
            ))}
          </SelectField>
          {!loading && !error && items.length > 0 && (
            <p className="text-sm font-medium text-on-surface-variant" role="status">
              {t(view === "unpaid" ? "paymentsAdmin.unpaidTotal" : "paymentsAdmin.paidTotal", {
                amount: formatMoney(total),
                count: items.length,
              })}
            </p>
          )}
        </div>
      )}
      {loading && (
        <div className="flex flex-col gap-3" role="status" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-24 rounded-card" />
          ))}
        </div>
      )}
      {!loading && error && <LoadError code={error} onRetry={reload} />}
      {!loading && !error && (
        <div className="flex flex-col gap-4">
          <AnimatePresence initial={false}>
            {groups.map((group) => (
              <PaymentPlanGroup
                key={group[0].row.plan.code}
                plan={group[0].row.plan}
                count={group.length}
                total={group.reduce((sum, item) => sum + item.row.amount, 0)}
              >
                {group.map((item) => (
                  <ReviewRow
                    key={item.code}
                    item={item}
                    view={view}
                    busy={busy.has(item.code) || (item.kind === "payment" && !!item.row.prepayment_code && busy.has(item.row.prepayment_code))}
                    onConfirm={(i) => void setStatus(i, "PAID")}
                    onRevert={(i) => void revert(i)}
                    onRevertPrepayment={(code, i) => void undoPrepayment(code, i)}
                  />
                ))}
              </PaymentPlanGroup>
            ))}
          </AnimatePresence>
        </div>
      )}
      {/* After the list, so the last row slides out above it instead of under it. */}
      {!loading && !error && items.length === 0 && (
        <EmptyState tone="success" icon="done" title={t(`paymentsAdmin.empty.${view}`, { period: formatPeriod(period) })} />
      )}
    </div>
  );
}
