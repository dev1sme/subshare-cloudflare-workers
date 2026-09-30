import { m } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { OpenPlan } from "../../../shared/types";
import { EmptyState } from "../../components/EmptyState";
import { LoadError } from "../../components/LoadError";
import { useConfirm } from "../../hooks/useConfirm";
import { listStagger } from "../../lib/motion";
import { AskToJoinDialog } from "./components/AskToJoinDialog";
import { ExploreSkeleton } from "./components/ExploreSkeleton";
import { OpenPlanCard } from "./components/OpenPlanCard";
import { RequestHistory } from "./components/RequestHistory";
import { useExplore } from "./useExplore";

export default function ExplorePlansPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { plans, requests, error, loading, reload, ask, cancel } = useExplore();
  // Screen state: which plan the "ask to join" dialog is open for.
  const [asking, setAsking] = useState<OpenPlan | null>(null);

  const confirmCancel = async (plan: OpenPlan) => {
    if (!plan.pending_request_code) return;
    const confirmed = await confirm({ title: t("explore.cancelTitle", { plan: plan.name }), destructive: true, confirmLabel: t("explore.cancel") });
    if (confirmed) await cancel(plan.pending_request_code);
  };

  if (loading) return <ExploreSkeleton />;
  if (error) return <LoadError code={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("explore.title")}</h1>
        <p className="text-on-surface-variant">{t("explore.subtitle")}</p>
      </header>
      {plans.length === 0 ? (
        <EmptyState title={t("explore.empty")} />
      ) : (
        <m.ul variants={listStagger} initial="hidden" animate="visible" className="flex flex-col gap-3">
          {plans.map((plan) => (
            <OpenPlanCard key={plan.code} plan={plan} onAsk={setAsking} onCancel={(p) => void confirmCancel(p)} />
          ))}
        </m.ul>
      )}
      <RequestHistory requests={requests} />
      <AskToJoinDialog plan={asking} onClose={() => setAsking(null)} onSubmit={(plan, note) => ask(plan.code, note)} />
    </div>
  );
}
