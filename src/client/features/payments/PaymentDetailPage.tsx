import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { LoadError } from "../../components/LoadError";
import { Spinner } from "../../components/Spinner";
import { MarkSentButton } from "./components/MarkSentButton";
import { PaymentHeader } from "./components/PaymentHeader";
import { PaymentStatusNote } from "./components/PaymentStatusNote";
import { TransferDetails } from "./components/TransferDetails";
import { usePayment } from "./usePayment";

export default function PaymentDetailPage() {
  const { t } = useTranslation();
  const { code = "" } = useParams();
  const { payment, transfer, error, loading, reload, markSent } = usePayment(code);

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/payments"
        className="-ml-2 inline-flex min-h-11 w-fit items-center gap-1 rounded-lg px-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
        {t("payments.back")}
      </Link>
      {loading && !payment && <Spinner />}
      {error && <LoadError code={error} onRetry={reload} />}
      {payment && (
        <>
          <PaymentHeader payment={payment} />
          <PaymentStatusNote payment={payment} />
          {transfer && <TransferDetails transfer={transfer} />}
          {!transfer && payment.status !== "PAID" && (
            <p className="text-sm text-muted-foreground">{t("payments.noBank", { code: payment.code })}</p>
          )}
          {payment.status === "UNPAID" && <MarkSentButton payment={payment} onMarkSent={markSent} />}
        </>
      )}
    </div>
  );
}
