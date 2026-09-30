import { ChevronLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "react-router";
import type { Payment } from "../../../shared/types";
import { LoadError } from "../../components/LoadError";
import { MarkSentButton } from "./components/MarkSentButton";
import { PaymentDetailSkeleton } from "./components/PaymentDetailSkeleton";
import { PaymentHeader } from "./components/PaymentHeader";
import { PaymentStatusNote } from "./components/PaymentStatusNote";
import { TransferDetails } from "./components/TransferDetails";
import { usePayment } from "./usePayment";

// The plan the home card linked from, if any — a hint for drawing the header early, never trusted
// over the loaded payment.
function planFromLinkState(state: unknown): Payment["plan"] | null {
  const plan = (state as { plan?: Payment["plan"] } | null)?.plan;
  return plan && typeof plan.code === "string" && typeof plan.name === "string" ? plan : null;
}

export default function PaymentDetailPage() {
  const { t } = useTranslation();
  const { code = "" } = useParams();
  const location = useLocation();
  const { payment, transfer, error, loading, reload, markSent } = usePayment(code);
  const plan = payment?.plan ?? planFromLinkState(location.state);

  return (
    <div className="flex flex-col gap-5">
      <Link
        to="/payments"
        className="state-layer relative -ml-3 inline-flex min-h-11 w-fit items-center gap-1 overflow-hidden rounded-full px-3 text-sm font-semibold text-primary focus-visible:outline-3 focus-visible:outline-primary"
      >
        <ChevronLeft className="size-5" aria-hidden="true" />
        {t("payments.back")}
      </Link>
      {error && <LoadError code={error} onRetry={reload} />}
      {!error && plan && <PaymentHeader plan={plan} payment={payment} />}
      {loading && !payment && <PaymentDetailSkeleton withHeader={!plan} />}
      {payment && (
        <>
          <PaymentStatusNote payment={payment} />
          {transfer && <TransferDetails transfer={transfer} />}
          {!transfer && payment.status !== "PAID" && (
            <p className="text-sm text-on-surface-variant">{t("payments.noBank", { code: payment.code })}</p>
          )}
          {payment.status === "UNPAID" && <MarkSentButton payment={payment} onMarkSent={markSent} />}
        </>
      )}
    </div>
  );
}
