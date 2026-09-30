import { Send } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Payment } from "../../../../shared/types";
import { Button } from "../../../components/ui/button";
import { useConfirm } from "../../../hooks/useConfirm";
import { formatMoney } from "../../../format";

type MarkSentButtonProps = {
  payment: Payment;
  onMarkSent: () => Promise<boolean>;
};

// Asks first: "sent" is a claim the admin will check against the bank statement.
export function MarkSentButton({ payment, onMarkSent }: MarkSentButtonProps) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const markSent = async () => {
    const confirmed = await confirm({
      title: t("payments.markSentTitle"),
      description: t("payments.markSentBody", { amount: formatMoney(payment.amount), code: payment.code }),
      confirmLabel: t("payments.markSent"),
    });
    if (!confirmed) return;
    setBusy(true);
    await onMarkSent();
    setBusy(false);
  };

  return (
    <Button className="w-full" disabled={busy} onClick={() => void markSent()}>
      <Send aria-hidden="true" />
      {t("payments.markSent")}
    </Button>
  );
}
