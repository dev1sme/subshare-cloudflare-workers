import { Clock, Lock, Sparkles, UserPlus, Users } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import type { OpenPlan } from "../../../../shared/types";
import { SlotMeter } from "../../../components/SlotMeter";
import { Button } from "../../../components/ui/button";
import { formatDateTime, formatMoney } from "../../../format";
import { listItem } from "../../../lib/motion";

type OpenPlanCardProps = {
  plan: OpenPlan;
  onAsk: (plan: OpenPlan) => void;
  onCancel: (plan: OpenPlan) => void;
};

// One plan a member may join. What they can do is said in words: a full plan has no button at
// all (a disabled one still looks tappable), and a plan reserved for the members who asked for it
// says until when.
export function OpenPlanCard({ plan, onAsk, onCancel }: OpenPlanCardProps) {
  const { t } = useTranslation();
  const free = plan.max_slots - plan.active_members;
  const reserved = plan.priority_until !== null && new Date(plan.priority_until) > new Date();
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
          {free > 0 ? t("explore.seats", { free, total: plan.max_slots }) : t("explore.fullSeats", { total: plan.max_slots })}
        </span>
      </div>
      {free > 0 && plan.pending_requests > 0 && !plan.pending_request_code && (
        <p className="flex items-center gap-2 text-sm text-on-surface-variant">
          <Users className="size-4 shrink-0" aria-hidden="true" />
          {t("explore.othersPending", { count: plan.pending_requests })}
        </p>
      )}
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
      ) : free <= 0 ? (
        <p className="rounded-2xl bg-surface-container-highest px-4 py-3 text-sm font-semibold text-on-surface-variant">
          {t("explore.fullNote")}
        </p>
      ) : reserved && !plan.priority_for_me ? (
        <p className="flex items-start gap-2 rounded-2xl bg-surface-container-highest px-4 py-3 text-sm text-on-surface-variant">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {t("explore.reserved", { until: formatDateTime(plan.priority_until!) })}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {reserved && (
            <p className="flex items-center gap-2 text-sm font-semibold text-primary">
              <Sparkles className="size-4 shrink-0" aria-hidden="true" />
              {t("explore.yourPriority", { until: formatDateTime(plan.priority_until!) })}
            </p>
          )}
          <Button onClick={() => onAsk(plan)}>
            <UserPlus aria-hidden="true" />
            {t("explore.ask")}
          </Button>
        </div>
      )}
    </m.li>
  );
}
