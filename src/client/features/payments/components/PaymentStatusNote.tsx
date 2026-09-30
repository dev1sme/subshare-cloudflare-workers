import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import type { Payment } from "../../../../shared/types";
import { formatDate } from "../../../format";
import { cn } from "../../../lib/cn";
import { spring } from "../../../lib/motion";

type StatusRow = Pick<Payment, "status" | "marked_at" | "confirmed_at"> & { prepayment_code?: string | null };

// What happens next, in words, for anything that is not simply "unpaid". Takes a payment or a
// prepayment; `paidText` replaces the default sentence once it is PAID.
export function PaymentStatusNote({ payment, paidText }: { payment: StatusRow; paidText?: string }) {
  const { t } = useTranslation();
  let text: string | null = null;
  if (payment.prepayment_code) text = t("payments.prepaidInfo", { code: payment.prepayment_code });
  else if (payment.status === "PENDING" && payment.marked_at)
    text = t("payments.pendingInfo", { date: formatDate(payment.marked_at) });
  else if (payment.status === "PAID" && payment.confirmed_at)
    text = paidText ?? t("payments.paidInfo", { date: formatDate(payment.confirmed_at) });
  if (!text) return null;
  return (
    <m.p
      key={payment.status}
      role="status"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0, transition: spring }}
      className={cn(
        "rounded-2xl px-5 py-4 text-sm font-medium",
        payment.status === "PAID"
          ? "bg-success-container text-on-success-container"
          : "bg-warning-container text-on-warning-container",
      )}
    >
      {text}
    </m.p>
  );
}
