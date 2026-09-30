import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../components/EmptyState";
import { ProviderSection } from "../../components/ProviderSection";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { listStagger } from "../../lib/motion";
import { groupByProvider } from "../../lib/providers";
import { PlanAdminRow } from "./components/PlanAdminRow";
import { usePlansAdmin } from "./usePlansAdmin";

// For now only the "accepting requests" switch; creating and editing plans comes with the full
// admin plans screen.
export default function PlansPage() {
  const { t } = useTranslation();
  const { plans, error, loading, reload, setAccepting } = usePlansAdmin();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.plans")}</h1>
        <p className="text-on-surface-variant">{t("plansAdmin.subtitle")}</p>
      </header>
      {loading && (
        <div className="flex flex-col gap-3" role="status" aria-busy="true">
          {[0, 1, 2].map((row) => (
            <Skeleton key={row} className="h-24 rounded-card" />
          ))}
        </div>
      )}
      {error && <LoadError code={error} onRetry={reload} />}
      {!loading && !error && plans.length === 0 && <EmptyState icon="plans" title={t("plansAdmin.empty")} />}
      {plans.length > 0 && (
        <m.ul variants={listStagger} initial="hidden" animate="visible" className="flex flex-col gap-8">
          {groupByProvider(plans).map(({ provider, items }) => (
            <ProviderSection key={provider} provider={provider}>
              {items.map((plan) => (
                <PlanAdminRow key={plan.code} plan={plan} onToggleAccepting={setAccepting} />
              ))}
            </ProviderSection>
          ))}
        </m.ul>
      )}
    </div>
  );
}
