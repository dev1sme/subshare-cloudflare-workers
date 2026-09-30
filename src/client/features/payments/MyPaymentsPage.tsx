import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { EmptyState } from "../../components/EmptyState";
import { LoadError } from "../../components/LoadError";
import { listStagger } from "../../lib/motion";
import { useWishes } from "../explore/WishesProvider";
import { MyPlanCard } from "./components/MyPlanCard";
import { OwedSummary } from "./components/OwedSummary";
import { PaymentList } from "./components/PaymentList";
import { PaymentListSkeleton } from "./components/PaymentListSkeleton";
import { WishOpenedBanner } from "./components/WishOpenedBanner";
import { useMyPlans } from "./useMyPlans";

// Member home: the plans they share, each with what is still open on it. Money is a property of a
// plan here, not the headline.
export default function MyPaymentsPage() {
  const { t } = useTranslation();
  const { plans, history, unpaidTotal, pendingTotal, empty, error, loading, reload } = useMyPlans();
  const { notices, dismiss } = useWishes();

  if (loading) return <PaymentListSkeleton />;
  if (error) return <LoadError code={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("nav.myPlans")}</h1>
      <WishOpenedBanner notices={notices} onDismiss={(code) => void dismiss(code)} />
      {empty ? (
        <EmptyState icon="plans" title={t("home.empty")} body={t("home.emptyBody")} />
      ) : (
        <>
          <OwedSummary unpaid={unpaidTotal} pending={pendingTotal} />
          <m.ul variants={listStagger} initial="hidden" animate="visible" className="flex flex-col gap-3">
            {plans.map((summary) => (
              <MyPlanCard key={summary.plan.code} summary={summary} />
            ))}
          </m.ul>
          <PaymentList title={t("home.history")} payments={history} />
        </>
      )}
    </div>
  );
}
