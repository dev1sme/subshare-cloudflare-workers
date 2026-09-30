import { useTranslation } from "react-i18next";
import type { Payment } from "../../../../shared/types";
import { formatDate } from "../../../format";
import { cn } from "../../../lib/cn";

// What happens next, in words, for anything that is not simply "unpaid".
export function PaymentStatusNote({ payment }: { payment: Payment }) {
  const { t } = useTranslation();
  let text: string | null = null;
  if (payment.prepayment_code) text = t("payments.prepaidInfo", { code: payment.prepayment_code });
  else if (payment.status === "PENDING" && payment.marked_at)
    text = t("payments.pendingInfo", { date: formatDate(payment.marked_at) });
  else if (payment.status === "PAID" && payment.confirmed_at)
    text = t("payments.paidInfo", { date: formatDate(payment.confirmed_at) });
  if (!text) return null;
  return (
    <p
      role="status"
      className={cn(
        "rounded-lg px-4 py-3 text-sm",
        payment.status === "PAID" ? "bg-paid-soft text-paid" : "bg-pending-soft text-pending",
      )}
    >
      {text}
    </p>
  );
}
