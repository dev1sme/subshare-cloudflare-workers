import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "react-router";
import { BackLink } from "../../components/BackLink";
import { LoadError } from "../../components/LoadError";
import { formatDate, formatMoney, formatPeriod } from "../../format";
import { DeletePrepaymentButton } from "./components/DeletePrepaymentButton";
import { MarkSentButton } from "./components/MarkSentButton";
import { PaymentDetailSkeleton } from "./components/PaymentDetailSkeleton";
import { PaymentHeader } from "./components/PaymentHeader";
import { PaymentStatusNote } from "./components/PaymentStatusNote";
import { TransferDetails } from "./components/TransferDetails";
import { planFromLinkState } from "./components/planFromLinkState";
import { usePrepayment } from "./usePrepayment";

// Several months paid in one transfer: the total, the months it covers, the QR with the PP… code.
export default function PrepaymentDetailPage() {
  const { t } = useTranslation();
  const { code = "" } = useParams();
  const location = useLocation();
  const { prepayment, transfer, error, loading, reload, markSent, remove } = usePrepayment(code);
  const plan = prepayment?.plan ?? planFromLinkState(location.state);
  const range = prepayment && { from: formatPeriod(prepayment.start_period), to: formatPeriod(prepayment.end_period) };

  return (
    <div className="flex flex-col gap-5">
      <BackLink to="/payments" label={t("payments.back")} />
      {error && <LoadError code={error} onRetry={reload} />}
      {!error && plan && (
        <PaymentHeader
          plan={plan}
          subtitle={prepayment && range && t("prepay.range", { months: prepayment.months, ...range })}
          amount={prepayment?.amount ?? null}
          status={prepayment?.status ?? null}
        />
      )}
      {loading && !prepayment && <PaymentDetailSkeleton withHeader={!plan} />}
      {prepayment && range && (
        <>
          {prepayment.status === "UNPAID" && (
            <p className="text-sm text-on-surface-variant">
              {t("prepay.unpaidInfo", { perMonth: formatMoney(prepayment.amount_per_month), ...range })}
            </p>
          )}
          <PaymentStatusNote
            payment={prepayment}
            paidText={prepayment.confirmed_at ? t("prepay.paidInfo", { date: formatDate(prepayment.confirmed_at), ...range }) : undefined}
          />
          {transfer && <TransferDetails transfer={transfer} />}
          {!transfer && prepayment.status !== "PAID" && (
            <p className="text-sm text-on-surface-variant">{t("payments.noBank", { code: prepayment.code })}</p>
          )}
          {prepayment.status === "UNPAID" && (
            <>
              <MarkSentButton amount={prepayment.amount} code={prepayment.code} onMarkSent={markSent} />
              <DeletePrepaymentButton onDelete={remove} />
            </>
          )}
        </>
      )}
    </div>
  );
}
