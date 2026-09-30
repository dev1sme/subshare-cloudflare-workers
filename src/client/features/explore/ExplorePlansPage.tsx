import { m } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { MyWish, OpenPlan } from "../../../shared/types";
import { EmptyState } from "../../components/EmptyState";
import { ProviderSection } from "../../components/ProviderSection";
import { LoadError } from "../../components/LoadError";
import { useConfirm } from "../../hooks/useConfirm";
import { listStagger } from "../../lib/motion";
import { groupByProvider } from "../../lib/providers";
import { wishName } from "../../lib/wishName";
import { AskToJoinDialog } from "./components/AskToJoinDialog";
import { ExploreSkeleton } from "./components/ExploreSkeleton";
import { OpenPlanCard } from "./components/OpenPlanCard";
import { RequestHistory } from "./components/RequestHistory";
import { WishDialog } from "./components/WishDialog";
import { WishSection } from "./components/WishSection";
import { useWishes } from "./WishesProvider";
import { useExplore } from "./useExplore";

export default function ExplorePlansPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { plans, requests, error, loading, reload, ask, cancel } = useExplore();
  const wishes = useWishes();
  // Screen state: which plan the "ask to join" dialog is open for, and the "ask for a plan" dialog.
  const [asking, setAsking] = useState<OpenPlan | null>(null);
  const [wishing, setWishing] = useState(false);

  const cancelWish = async (wish: MyWish) => {
    const confirmed = await confirm({ title: t("wishes.cancelTitle", { service: wishName(wish) }), destructive: true, confirmLabel: t("wishes.cancel") });
    if (confirmed) await wishes.cancel(wish.code);
  };

  // The plan opened for a wish is one of the open plans on this screen.
  const joinFromWish = (wish: MyWish) => {
    const plan = plans.find((candidate) => candidate.code === wish.plan?.code);
    if (plan) setAsking(plan);
  };

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
        <EmptyState icon="explore" title={t("explore.empty")} />
      ) : (
        <m.ul variants={listStagger} initial="hidden" animate="visible" className="flex flex-col gap-8">
          {groupByProvider(plans).map(({ provider, items }) => (
            <ProviderSection key={provider} provider={provider}>
              {items.map((plan) => (
                <OpenPlanCard key={plan.code} plan={plan} onAsk={setAsking} onCancel={(p) => void confirmCancel(p)} />
              ))}
            </ProviderSection>
          ))}
        </m.ul>
      )}
      <WishSection wishes={wishes.wishes} onNew={() => setWishing(true)} onCancel={(w) => void cancelWish(w)} onJoin={joinFromWish} />
      <RequestHistory requests={requests} />
      <AskToJoinDialog plan={asking} onClose={() => setAsking(null)} onSubmit={(plan, note) => ask(plan.code, note)} />
      <WishDialog open={wishing} onClose={() => setWishing(false)} onSubmit={wishes.send} />
    </div>
  );
}
