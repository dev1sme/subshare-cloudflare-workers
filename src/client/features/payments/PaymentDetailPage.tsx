import { ChevronLeft } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";
import { LoadError } from "../../components/LoadError";
import { MarkSentButton } from "./components/MarkSentButton";
import { PaymentDetailSkeleton } from "./components/PaymentDetailSkeleton";
import { PaymentHeader } from "./components/PaymentHeader";
import { PaymentStatusNote } from "./components/PaymentStatusNote";
import { SentCelebration } from "./components/SentCelebration";
import { TransferDetails } from "./components/TransferDetails";
import { usePayment } from "./usePayment";

export default function PaymentDetailPage() {
  const { t } = useTranslation();
  const { code = "" } = useParams();
  const { payment, transfer, error, loading, reload, markSent } = usePayment(code);
  // Screen state: celebrate only the report made on this visit, not every PENDING payment.
  const [justSent, setJustSent] = useState(false);

  const handleMarkSent = async () => {
    const sent = await markSent();
    if (sent) setJustSent(true);
    return sent;
  };

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/payments"
        className="state-layer relative -ml-3 inline-flex min-h-11 w-fit items-center gap-1 overflow-hidden rounded-full px-3 text-sm font-semibold text-primary focus-visible:outline-3 focus-visible:outline-primary"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        {t("payments.back")}
      </Link>
      {loading && !payment && <PaymentDetailSkeleton />}
      {error && <LoadError code={error} onRetry={reload} />}
      {payment && (
        <>
          <PaymentHeader payment={payment} />
          <AnimatePresence>{justSent && <SentCelebration />}</AnimatePresence>
          {!justSent && <PaymentStatusNote payment={payment} />}
          {transfer && <TransferDetails transfer={transfer} />}
          {!transfer && payment.status !== "PAID" && (
            <p className="text-sm text-on-surface-variant">{t("payments.noBank", { code: payment.code })}</p>
          )}
          {payment.status === "UNPAID" && <MarkSentButton payment={payment} onMarkSent={handleMarkSent} />}
        </>
      )}
    </div>
  );
}
