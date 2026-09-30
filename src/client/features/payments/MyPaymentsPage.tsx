import { useTranslation } from "react-i18next";
import { EmptyState } from "../../components/EmptyState";
import { LoadError } from "../../components/LoadError";
import { DueSummary } from "./components/DueSummary";
import { PaymentList } from "./components/PaymentList";
import { PaymentListSkeleton } from "./components/PaymentListSkeleton";
import { useMyPayments } from "./useMyPayments";

export default function MyPaymentsPage() {
  const { t } = useTranslation();
  const { due, paid, totalDue, error, loading, reload } = useMyPayments();

  if (loading) return <PaymentListSkeleton />;
  if (error) return <LoadError code={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("nav.myPayments")}</h1>
      {due.length === 0 && paid.length === 0 ? (
        <EmptyState title={t("payments.empty")} />
      ) : (
        <>
          <DueSummary totalDue={totalDue} dueCount={due.length} />
          <PaymentList title={t("payments.due")} payments={due} />
          <PaymentList title={t("payments.paid")} payments={paid} />
        </>
      )}
    </div>
  );
}
