import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router";
import { LoadError } from "../../components/LoadError";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { ServiceLogo } from "../../components/ServiceLogo";
import { Skeleton } from "../../components/Skeleton";
import { Button } from "../../components/ui/button";
import { useConfirm } from "../../hooks/useConfirm";
import { BackLink } from "../../components/BackLink";
import { PlanForm } from "./components/PlanForm";
import { PlanMembers } from "./components/PlanMembers";
import { PlanPeriods } from "./components/PlanPeriods";
import { toPlanInput, usePlanEditor } from "./usePlanEditor";
import { usePlanMembers } from "./usePlanMembers";
import { usePlanPeriods } from "./usePlanPeriods";

type Section = "info" | "members" | "periods";

export default function PlanDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { code = "" } = useParams();
  // Screen state: which section of the plan is shown.
  const [section, setSection] = useState<Section>("members");
  const editor = usePlanEditor(code);
  const members = usePlanMembers(code, editor.plan?.payer.code ?? null, editor.accounts);
  const periods = usePlanPeriods(code);
  const plan = editor.plan;

  const remove = async () => {
    if (!plan) return;
    const confirmed = await confirm({
      title: t("planEditor.deleteTitle", { plan: plan.name }),
      description: t("planEditor.deleteBody"),
      destructive: true,
      confirmLabel: t("planEditor.delete"),
    });
    if (confirmed && (await editor.remove())) navigate("/admin/plans", { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/admin/plans" label={t("nav.plans")} />
      {editor.loading && <Skeleton className="h-16 w-2/3 rounded-2xl" />}
      {editor.error && <LoadError code={editor.error} onRetry={editor.reload} />}
      {plan && (
        <>
          <header className="flex items-center gap-4">
            <ServiceLogo provider={plan.provider} name={plan.name} className="size-14 text-lg" />
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight break-words">{plan.name}</h1>
              {!plan.active && <p className="text-sm text-on-surface-variant">{t("plansAdmin.inactive")}</p>}
            </div>
          </header>
          <SegmentedTabs
            label={t("planEditor.sections")}
            layoutId="plan-detail-section"
            value={section}
            onChange={setSection}
            segments={[
              { value: "members", label: t("planEditor.membersSection") },
              { value: "periods", label: t("planEditor.periodsSection") },
              { value: "info", label: t("planEditor.infoSection") },
            ]}
          />
          {section === "members" &&
            (members.error ? (
              <LoadError code={members.error} onRetry={members.reload} />
            ) : members.loading ? (
              <Skeleton className="h-48 rounded-card" />
            ) : (
              <PlanMembers
                members={members.members}
                candidates={members.candidates}
                maxSlots={plan.max_slots}
                planActive={plan.active}
                onAdd={members.add}
                onLeave={members.leave}
              />
            ))}
          {section === "periods" &&
            (periods.error ? (
              <LoadError code={periods.error} onRetry={periods.reload} />
            ) : periods.loading ? (
              <Skeleton className="h-48 rounded-card" />
            ) : (
              <PlanPeriods periods={periods.periods} planActive={plan.active} onCreate={periods.createCurrent} />
            ))}
          {section === "info" && (
            <>
              <PlanForm
                // Remount on save so the form starts from what the server stored.
                key={JSON.stringify(toPlanInput(plan))}
                initial={toPlanInput(plan)}
                admins={editor.admins}
                errors={editor.fieldErrors}
                saving={editor.saving}
                submitLabel={t("planEditor.save")}
                onSubmit={(input) => void editor.save(input)}
              />
              <section className="flex flex-col gap-3 rounded-card border border-error/30 p-5">
                <h2 className="font-semibold">{t("planEditor.deleteTitleShort")}</h2>
                <p className="text-sm text-on-surface-variant">{t("planEditor.deleteHint")}</p>
                <Button variant="outlined" className="w-fit border-error/50 text-error" onClick={() => void remove()}>
                  <Trash2 aria-hidden="true" />
                  {t("planEditor.delete")}
                </Button>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}
