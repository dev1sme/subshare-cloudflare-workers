import { m } from "motion/react";
import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
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
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="min-w-0">
          <p className="truncate font-bold">{plan.name}</p>
          <p className="text-sm text-on-surface-variant">
            {formatMoney(plan.member_amount)} · {t("plansAdmin.members", { used: plan.active_members, total: plan.max_slots })}
            {!plan.active && ` · ${t("plansAdmin.inactive")}`}
          </p>
        </div>
      </div>
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
