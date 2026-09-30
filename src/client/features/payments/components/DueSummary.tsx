import { PartyPopper } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { AnimatedNumber } from "../../../components/AnimatedNumber";
import { formatMoney } from "../../../format";
import { spring } from "../../../lib/motion";

// Hero card: the one number a member opens the app for. Counts up on load.
export function DueSummary({ totalDue, dueCount }: { totalDue: number; dueCount: number }) {
  const { t } = useTranslation();
  if (totalDue === 0) {
    return (
      <m.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1, transition: spring }}
        className="flex items-center gap-4 rounded-card bg-success-container p-6 text-on-success-container"
      >
        <PartyPopper className="size-8 shrink-0" aria-hidden="true" />
        <p className="text-lg font-semibold">{t("payments.nothingDue")}</p>
      </m.div>
    );
  }
  return (
    <m.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1, transition: spring }}
      className="relative overflow-hidden rounded-card bg-linear-135 from-primary to-tertiary p-6 text-on-primary"
    >
      {/* Decorative shapes; the text carries everything. */}
      <span aria-hidden="true" className="absolute -top-10 -right-8 size-36 rounded-[2.5rem] bg-on-primary/10 rotate-12" />
      <span aria-hidden="true" className="absolute -bottom-12 right-16 size-24 rounded-full bg-on-primary/10" />
      <p className="relative text-sm font-medium opacity-90">{t("payments.totalDue")}</p>
      <p className="relative mt-1 text-4xl font-bold tracking-tight tabular-nums" aria-live="polite">
        <AnimatedNumber value={totalDue} format={formatMoney} />
      </p>
      <p className="relative mt-2 text-sm opacity-90">{t("payments.dueCount", { count: dueCount })}</p>
    </m.div>
  );
}
