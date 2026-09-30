import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router";
import { BackLink } from "../../components/BackLink";
import { LoadError } from "../../components/LoadError";
import { formatPeriod } from "../../format";
import { MarkSentButton } from "./components/MarkSentButton";
import { PaymentDetailSkeleton } from "./components/PaymentDetailSkeleton";
import { PaymentHeader } from "./components/PaymentHeader";
import { PaymentStatusNote } from "./components/PaymentStatusNote";
import { planFromLinkState } from "./components/planFromLinkState";
import { TransferDetails } from "./components/TransferDetails";
import { usePayment } from "./usePayment";

export default function PaymentDetailPage() {
  const { t } = useTranslation();
  const { code = "" } = useParams();
  const location = useLocation();
  const { payment, transfer, error, loading, reload, markSent } = usePayment(code);
  const plan = payment?.plan ?? planFromLinkState(location.state);

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/payments" label={t("payments.back")} />
      {error && <LoadError code={error} onRetry={reload} />}
      {!error && plan && (
        <PaymentHeader
          plan={plan}
          subtitle={payment && t("payments.period", { period: formatPeriod(payment.period) })}
          amount={payment?.amount ?? null}
          status={payment?.status ?? null}
        />
      )}
      {loading && !payment && <PaymentDetailSkeleton withHeader={!plan} />}
      {payment && (
        <>
          <PaymentStatusNote payment={payment} />
          {transfer && <TransferDetails transfer={transfer} />}
          {!transfer && payment.status !== "PAID" && (
            <p className="text-sm text-on-surface-variant">{t("payments.noBank", { code: payment.code })}</p>
          )}
          {payment.status === "UNPAID" && <MarkSentButton amount={payment.amount} code={payment.code} onMarkSent={markSent} />}
        </>
      )}
    </div>
  );
}
