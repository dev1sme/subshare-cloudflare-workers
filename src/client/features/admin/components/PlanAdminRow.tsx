import { m } from "motion/react";
import { useId, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Plan } from "../../../../shared/types";
import { Switch } from "../../../components/ui/switch";
import { formatMoney } from "../../../format";
import { listItem } from "../../../lib/motion";

type PlanAdminRowProps = {
  plan: Plan;
  onToggleAccepting: (plan: Plan, accepting: boolean) => Promise<boolean>;
};

export function PlanAdminRow({ plan, onToggleAccepting }: PlanAdminRowProps) {
  const { t } = useTranslation();
  const switchId = useId();
  const [busy, setBusy] = useState(false);

  const toggle = async (accepting: boolean) => {
    setBusy(true);
    await onToggleAccepting(plan, accepting);
    setBusy(false);
  };

  return (
    <m.li variants={listItem} className="flex flex-col gap-4 rounded-card bg-surface-container-low p-5 sm:flex-row sm:items-center">
      {/* The name area is the link; the switch beside it stays a separate control. */}
      <Link
        to={`/admin/plans/${plan.code}`}
        className="state-layer relative -m-2 flex min-h-11 min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-2xl p-2 focus-visible:outline-3 focus-visible:outline-primary"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{plan.name}</p>
          <p className="text-sm text-on-surface-variant">
            {formatMoney(plan.member_amount)} · {t("plansAdmin.members", { used: plan.active_members, total: plan.max_slots })}
            {!plan.active && ` · ${t("plansAdmin.inactive")}`}
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-on-surface-variant sm:hidden" aria-hidden="true" />
      </Link>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <label htmlFor={switchId} className="cursor-pointer text-sm font-semibold">
          {t("plansAdmin.accepting")}
        </label>
        <Switch
          id={switchId}
          checked={plan.accepting_requests}
          disabled={busy || !plan.active}
          onCheckedChange={(checked) => void toggle(checked)}
        />
      </div>
    </m.li>
  );
}
