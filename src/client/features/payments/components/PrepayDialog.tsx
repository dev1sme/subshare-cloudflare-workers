import { CalendarRange, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { PREPAY_MONTHS } from "../../../../shared/types";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { formatMoney } from "../../../format";
import { cn } from "../../../lib/cn";
import type { MyPlanSummary } from "../useMyPlans";

type PrepayDialogProps = {
  // null = closed. Only a plan the member still sits in (memberAmount set) is ever passed.
  summary: MyPlanSummary | null;
  onClose: () => void;
  onSubmit: (summary: MyPlanSummary, months: number) => Promise<boolean>;
};

// Pick 3, 6 or 12 months. The totals here are a preview: the server computes the range and the
// amount (docs/payments.md#trả-trước) and the transfer screen shows what it decided.
export function PrepayDialog({ summary, onClose, onSubmit }: PrepayDialogProps) {
  const { t } = useTranslation();
  const [months, setMonths] = useState<number>(PREPAY_MONTHS[1]);
  const [sending, setSending] = useState(false);
  const perMonth = summary?.memberAmount ?? 0;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!summary) return;
    setSending(true);
    const created = await onSubmit(summary, months);
    setSending(false);
    if (created) onClose();
  };

  return (
    <Dialog open={summary !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogTitle>{t("prepay.title", { plan: summary?.plan.name ?? "" })}</DialogTitle>
        <DialogDescription>{t("prepay.body", { amount: formatMoney(perMonth) })}</DialogDescription>
        <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <fieldset className="flex flex-col gap-2">
            <legend className="sr-only">{t("prepay.months")}</legend>
            {PREPAY_MONTHS.map((option) => (
              <label
                key={option}
                className={cn(
                  "state-layer relative flex min-h-14 cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border px-4 py-2 transition-colors duration-200",
                  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-primary",
                  months === option ? "border-primary bg-secondary-container text-on-secondary-container" : "border-outline-variant",
                )}
              >
                <input
                  type="radio"
                  name="months"
                  value={option}
                  checked={months === option}
                  onChange={() => setMonths(option)}
                  className="size-5 accent-primary"
                />
                <span className="flex-1 font-semibold">{t("prepay.option", { months: option })}</span>
                <span className="font-bold tabular-nums">{formatMoney(option * perMonth)}</span>
              </label>
            ))}
          </fieldset>
          <p className="text-sm text-on-surface-variant">{t("prepay.rangeHint")}</p>
          <div className="flex flex-wrap justify-end gap-2">
            <DialogClose asChild>
              <Button variant="text">{t("confirm.cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={sending}>
              {sending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <CalendarRange aria-hidden="true" />}
              {t("prepay.submit")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
