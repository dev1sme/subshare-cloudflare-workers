import { useTranslation } from "react-i18next";
import { LoadError } from "../../components/LoadError";
import { Spinner } from "../../components/Spinner";
import { DueSummary } from "./components/DueSummary";
import { PaymentList } from "./components/PaymentList";
import { useMyPayments } from "./useMyPayments";

export default function MyPaymentsPage() {
  const { t } = useTranslation();
  const { due, paid, totalDue, error, loading, reload } = useMyPayments();

  if (loading) return <Spinner />;
  if (error) return <LoadError code={error} onRetry={reload} />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{t("nav.myPayments")}</h1>
      <DueSummary totalDue={totalDue} />
      <PaymentList title={t("payments.due")} payments={due} />
      <PaymentList title={t("payments.paid")} payments={paid} />
      {due.length === 0 && paid.length === 0 && <p className="text-muted-foreground">{t("payments.empty")}</p>}
    </div>
  );
}
