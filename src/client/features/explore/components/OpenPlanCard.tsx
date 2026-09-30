import { Clock, UserPlus } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import type { OpenPlan } from "../../../../shared/types";
import { SlotMeter } from "../../../components/SlotMeter";
import { Button } from "../../../components/ui/button";
import { formatMoney } from "../../../format";
import { listItem } from "../../../lib/motion";

type OpenPlanCardProps = {
  plan: OpenPlan;
  onAsk: (plan: OpenPlan) => void;
  onCancel: (plan: OpenPlan) => void;
};

export function OpenPlanCard({ plan, onAsk, onCancel }: OpenPlanCardProps) {
  const { t } = useTranslation();
  const free = plan.max_slots - plan.active_members;
  return (
    <m.li variants={listItem} layout="position" className="flex flex-col gap-4 rounded-card bg-surface-container-low p-5">
      {/* The provider's logo heads the section; the card leads with what differs: name and price. */}
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="min-w-0 truncate text-lg font-bold">{plan.name}</h3>
        <p className="shrink-0 font-semibold tabular-nums">{t("explore.perMonth", { amount: formatMoney(plan.member_amount) })}</p>
      </div>
      <div className="flex items-center justify-between gap-3">
        <SlotMeter used={plan.active_members} total={plan.max_slots} />
        <span className="text-sm text-on-surface-variant">
          {free > 0 ? t("explore.seats", { free, total: plan.max_slots }) : t("explore.full")}
        </span>
      </div>
      {plan.pending_request_code ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-warning-container py-1 pr-1 pl-4 text-on-warning-container">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="size-4" aria-hidden="true" />
            {t("explore.pending")}
          </span>
          <Button variant="text" className="text-on-warning-container" onClick={() => onCancel(plan)}>
            {t("explore.cancel")}
          </Button>
        </div>
      ) : (
        <Button variant={free > 0 ? "filled" : "tonal"} disabled={free <= 0} onClick={() => onAsk(plan)}>
          <UserPlus aria-hidden="true" />
          {free > 0 ? t("explore.ask") : t("explore.full")}
        </Button>
      )}
    </m.li>
  );
}
