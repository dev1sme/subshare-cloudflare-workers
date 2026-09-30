import { Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { useConfirm } from "../../../hooks/useConfirm";

// Dropping a prepayment the member has not paid for. The months go back to being billed one by one.
export function DeletePrepaymentButton({ onDelete }: { onDelete: () => Promise<boolean> }) {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const [busy, setBusy] = useState(false);

  const remove = async () => {
    const confirmed = await confirm({
      title: t("prepay.deleteTitle"),
      description: t("prepay.deleteBody"),
      destructive: true,
      confirmLabel: t("prepay.delete"),
    });
    if (!confirmed) return;
    setBusy(true);
    // On success the screen navigates away; only a refusal needs the button back.
    if (!(await onDelete())) setBusy(false);
  };

  return (
    <Button variant="text" className="self-center text-error" disabled={busy} onClick={() => void remove()}>
      <Trash2 aria-hidden="true" />
      {t("prepay.delete")}
    </Button>
  );
}
