import { LoaderCircle, Send } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Provider } from "../../../../shared/providers";
import { ProviderPicker } from "../../../components/ProviderPicker";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { TextArea } from "../../../components/ui/text-area";
import { TextField } from "../../../components/ui/text-field";

type WishDialogProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (fields: { provider: Provider; service_name: string | null; note: string }) => Promise<boolean>;
};

const NOTE_MAX = 200;
const NAME_MAX = 64;

// Ask for a plan of any service to be opened — one that is full, or one with no plan yet. "Khác"
// takes the service's name.
export function WishDialog({ open, onClose, onSubmit }: WishDialogProps) {
  const { t } = useTranslation();
  const [provider, setProvider] = useState<Provider>("YOUTUBE");
  const [serviceName, setServiceName] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    const sent = await onSubmit({ provider, service_name: provider === "OTHER" ? serviceName.trim() : null, note });
    setSending(false);
    if (sent) {
      setServiceName("");
      setNote("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      {/* Taller than the other dialogs: the provider grid scrolls inside on a small phone. */}
      <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-md overflow-y-auto">
        <DialogTitle>{t("wishes.dialogTitle")}</DialogTitle>
        <DialogDescription>{t("wishes.dialogBody")}</DialogDescription>
        <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <ProviderPicker legend={t("wishes.service")} value={provider} onChange={setProvider} />
          {provider === "OTHER" && (
            <TextField label={t("wishes.serviceName")} value={serviceName} maxLength={NAME_MAX} onChange={(event) => setServiceName(event.target.value)} />
          )}
          <TextArea label={t("wishes.noteLabel")} maxLength={NOTE_MAX} value={note} onChange={(event) => setNote(event.target.value)} />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="text">{t("confirm.cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={sending || (provider === "OTHER" && serviceName.trim() === "")}>
              {sending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
              {t("wishes.send")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
