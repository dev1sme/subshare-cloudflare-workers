import { LoaderCircle, Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { OpenPlan } from "../../../../shared/types";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { TextArea } from "../../../components/ui/text-area";
import { formatMoney } from "../../../format";

type AskToJoinDialogProps = {
  // null = closed.
  plan: OpenPlan | null;
  onClose: () => void;
  onSubmit: (plan: OpenPlan, note: string) => Promise<boolean>;
};

const NOTE_MAX = 200;

export function AskToJoinDialog({ plan, onClose, onSubmit }: AskToJoinDialogProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!plan) return;
    setSending(true);
    const sent = await onSubmit(plan, note);
    setSending(false);
    if (sent) {
      setNote("");
      onClose();
    }
  };

  return (
    <Dialog open={plan !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{t("explore.askTitle", { plan: plan?.name ?? "" })}</DialogTitle>
        <DialogDescription>
          {t("explore.askBody", { amount: formatMoney(plan?.member_amount ?? 0) })}
        </DialogDescription>
        <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <TextArea
            label={t("explore.noteLabel")}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(event) => setNote(event.target.value)}
          />
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button variant="text">{t("confirm.cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={sending}>
              {sending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              {t("explore.send")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
