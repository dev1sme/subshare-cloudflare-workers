import { CalendarPlus } from "lucide-react";
import { m } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Period } from "../../../../shared/types";
import { EmptyState } from "../../../components/EmptyState";
import { Button } from "../../../components/ui/button";
import { formatMoney, formatPeriod } from "../../../format";
import { listItem, listStagger } from "../../../lib/motion";

// Periods of a plan with how much of each is collected. The cron creates them on the 1st; the
// button covers a plan created mid-month or a cron that has not run yet.
export function PlanPeriods({ periods, planActive, onCreate }: { periods: Period[]; planActive: boolean; onCreate: () => Promise<boolean> }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const create = async () => {
    setBusy(true);
    await onCreate();
    setBusy(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-on-surface-variant">{t("planPeriods.hint")}</p>
        <Button variant="tonal" onClick={() => void create()} disabled={busy || !planActive}>
          <CalendarPlus aria-hidden="true" />
          {t("planPeriods.create")}
        </Button>
      </div>
      {periods.length === 0 ? (
        <EmptyState icon="plans" title={t("planPeriods.empty")} />
      ) : (
        <m.ul variants={listStagger} initial="hidden" animate="visible" className="flex flex-col gap-2">
          {periods.map((period) => {
            const share = period.amount_total === 0 ? 1 : period.amount_paid / period.amount_total;
            return (
              <m.li key={period.code} variants={listItem} className="flex flex-col gap-2 rounded-3xl bg-surface-container-low px-4 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold">{t("payments.period", { period: formatPeriod(period.period) })}</p>
                  <p className="text-sm font-semibold tabular-nums">
                    {formatMoney(period.amount_paid)} / {formatMoney(period.amount_total)}
                  </p>
                </div>
                {/* The bar is decorative; the figures above and the count below say it in text. */}
                <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest" aria-hidden="true">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(share * 100)}%` }} />
                </div>
                <p className="text-xs text-on-surface-variant">
                  {t("planPeriods.paidCount", { paid: period.paid_count, total: period.payment_count })}
                </p>
              </m.li>
            );
          })}
        </m.ul>
      )}
    </div>
  );
}
