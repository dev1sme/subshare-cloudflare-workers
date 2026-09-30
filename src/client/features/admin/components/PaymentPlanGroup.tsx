import { AnimatePresence, m } from "motion/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Payment } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { formatMoney } from "../../../format";
import { spring } from "../../../lib/motion";

// One plan's rows under its logo and name, with how many and how much — so it is clear which
// member belongs to which plan. The group leaves once its last row does.
export function PaymentPlanGroup({ plan, count, total, children }: { plan: Payment["plan"]; count: number; total: number; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <m.section
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: spring }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="overflow-hidden rounded-card bg-surface-container-low"
    >
      <header className="flex items-center gap-3 border-b border-outline-variant/50 px-4 py-3">
        <ServiceLogo provider={plan.provider} name={plan.name} className="size-10 rounded-xl text-sm" />
        <h2 className="min-w-0 flex-1 truncate font-bold">{plan.name}</h2>
        <p className="shrink-0 text-sm font-semibold text-on-surface-variant tabular-nums">
          {t("paymentsAdmin.groupSummary", { count, amount: formatMoney(total) })}
        </p>
      </header>
      <ul className="divide-y divide-outline-variant/50">
        <AnimatePresence initial={false}>{children}</AnimatePresence>
      </ul>
    </m.section>
  );
}
