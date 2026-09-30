import { LoaderCircle, Wallet } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Member } from "../../../../shared/types";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { SelectField } from "../../../components/ui/select-field";
import { formatMoney, formatPeriod } from "../../../format";
import { addMonths, currentPeriod, firstBilledPeriod } from "../../../lib/period";
import type { MemberLedger } from "../usePlanLedger";

// Same limits as the server (POST /api/prepayments): 24 months at once, and how far back to offer.
const MAX_MONTHS = 24;
const LOOK_BACK = 24;

// Months nothing can be recorded for: settled or reported periods, and any prepayment's range.
function takenMonths(ledger: MemberLedger): Set<string> {
  const taken = new Set(ledger.payments.filter((p) => p.status !== "UNPAID" || p.prepayment_code).map((p) => p.period));
  for (const prepayment of ledger.prepayments) {
    for (let period = prepayment.start_period; period <= prepayment.end_period; period = addMonths(period, 1)) taken.add(period);
  }
  return taken;
}

type RecordPaidDialogProps = {
  // null = closed.
  member: Member | null;
  ledger: MemberLedger;
  memberAmount: number;
  onClose: () => void;
  onSubmit: (member: Member, from: string, to: string) => Promise<boolean>;
};

// "Paid up to month X" for money received outside the app. Only months still open are offered, and
// the range ends at the first month that is not, so a pick cannot overlap on the server.
export function RecordPaidDialog({ member, ledger, memberAmount, onClose, onSubmit }: RecordPaidDialogProps) {
  const { t } = useTranslation();
  const [picked, setPicked] = useState<{ from: string; to: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const starts = useMemo(() => {
    if (!member) return [];
    const taken = takenMonths(ledger);
    const current = currentPeriod();
    const first = firstBilledPeriod(member.joined_on);
    const earliest = first > addMonths(current, -LOOK_BACK) ? first : addMonths(current, -LOOK_BACK);
    const last = member.left_on ? member.left_on.slice(0, 7) : addMonths(current, MAX_MONTHS - 1);
    const open: string[] = [];
    for (let period = earliest; period <= last; period = addMonths(period, 1)) if (!taken.has(period)) open.push(period);
    return open;
  }, [ledger, member]);

  const from = picked?.from ?? starts[0] ?? "";
  // From `from` on, consecutive open months, at most MAX_MONTHS.
  const ends = useMemo(() => {
    const index = starts.indexOf(from);
    const run: string[] = [];
    for (let i = index; i >= 0 && i < starts.length && run.length < MAX_MONTHS; i++) {
      if (run.length > 0 && starts[i] !== addMonths(run[run.length - 1], 1)) break;
      run.push(starts[i]);
    }
    return run;
  }, [from, starts]);
  const to = picked && ends.includes(picked.to) ? picked.to : (ends[0] ?? "");
  const months = ends.indexOf(to) + 1;

  const close = () => {
    setPicked(null);
    onClose();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!member || !from || !to) return;
    setBusy(true);
    const recorded = await onSubmit(member, from, to);
    setBusy(false);
    if (recorded) close();
  };

  return (
    <Dialog open={member !== null} onOpenChange={(open) => !open && close()}>
      <DialogContent>
        <DialogTitle>{t("recordPaid.title", { user: member?.user.display_name ?? "" })}</DialogTitle>
        <DialogDescription>{t("recordPaid.body", { amount: formatMoney(memberAmount) })}</DialogDescription>
        {starts.length === 0 ? (
          <p className="text-sm text-on-surface-variant">{t("recordPaid.nothingOpen")}</p>
        ) : (
          <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
            <SelectField label={t("recordPaid.from")} value={from} onChange={(event) => setPicked({ from: event.target.value, to: event.target.value })}>
              {starts.map((period) => (
                <option key={period} value={period}>
                  {formatPeriod(period)}
                </option>
              ))}
            </SelectField>
            <SelectField label={t("recordPaid.to")} value={to} onChange={(event) => setPicked({ from, to: event.target.value })}>
              {ends.map((period) => (
                <option key={period} value={period}>
                  {formatPeriod(period)}
                </option>
              ))}
            </SelectField>
            <p className="text-sm font-semibold tabular-nums" role="status">
              {t("recordPaid.total", { months, amount: formatMoney(months * memberAmount) })}
            </p>
            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="text">{t("confirm.cancel")}</Button>
              </DialogClose>
              <Button type="submit" disabled={busy || months === 0}>
                {busy ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Wallet aria-hidden="true" />}
                {t("recordPaid.submit")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
