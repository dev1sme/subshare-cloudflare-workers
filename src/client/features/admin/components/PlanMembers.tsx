import { LogOut, UserPlus } from "lucide-react";
import { m } from "motion/react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Account, Member } from "../../../../shared/types";
import { EmptyState } from "../../../components/EmptyState";
import { UserAvatar } from "../../../components/UserAvatar";
import { Button } from "../../../components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "../../../components/ui/dialog";
import { SelectField } from "../../../components/ui/select-field";
import { TextField } from "../../../components/ui/text-field";
import { formatDate } from "../../../format";
import { listItem, listStagger } from "../../../lib/motion";
import { today } from "../../../lib/period";

type PlanMembersProps = {
  members: Member[];
  candidates: Account[];
  maxSlots: number;
  planActive: boolean;
  onAdd: (userCode: string, joinedOn: string) => Promise<boolean>;
  onLeave: (member: Member, leftOn: string) => Promise<boolean>;
};

// Seats of a plan: current ones first, past ones kept as history (no "un-leave", no delete —
// coming back is a new seat).
export function PlanMembers({ members, candidates, maxSlots, planActive, onAdd, onLeave }: PlanMembersProps) {
  const { t } = useTranslation();
  // Screen state: which dialog is open.
  const [adding, setAdding] = useState(false);
  const [leaving, setLeaving] = useState<Member | null>(null);
  const activeCount = members.filter((member) => member.left_on === null).length;
  const full = activeCount >= maxSlots;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-on-surface-variant">{t("plansAdmin.members", { used: activeCount, total: maxSlots })}</p>
        <Button variant="tonal" onClick={() => setAdding(true)} disabled={full || !planActive || candidates.length === 0}>
          <UserPlus aria-hidden="true" />
          {full ? t("explore.full") : t("planMembers.add")}
        </Button>
      </div>
      {members.length === 0 ? (
        <EmptyState icon="plans" title={t("planMembers.empty")} />
      ) : (
        <m.ul variants={listStagger} initial="hidden" animate="visible" className="flex flex-col gap-2">
          {members.map((member) => (
            <m.li
              key={member.code}
              variants={listItem}
              className="flex items-center gap-3 rounded-3xl bg-surface-container-low px-4 py-3"
            >
              <UserAvatar name={member.user.display_name} />
              <div className="min-w-0 flex-1">
                <p className={member.left_on ? "truncate font-semibold text-on-surface-variant" : "truncate font-semibold"}>{member.user.display_name}</p>
                <p className="text-sm text-on-surface-variant">
                  {member.left_on
                    ? t("planMembers.stayed", { from: formatDate(member.joined_on), to: formatDate(member.left_on) })
                    : t("planMembers.since", { date: formatDate(member.joined_on) })}
                </p>
              </div>
              {!member.left_on && (
                <Button variant="text" onClick={() => setLeaving(member)}>
                  <LogOut aria-hidden="true" />
                  {t("planMembers.leave")}
                </Button>
              )}
            </m.li>
          ))}
        </m.ul>
      )}
      <AddMemberDialog open={adding} candidates={candidates} onClose={() => setAdding(false)} onSubmit={onAdd} />
      <LeaveDialog member={leaving} onClose={() => setLeaving(null)} onSubmit={onLeave} />
    </div>
  );
}

function AddMemberDialog({
  open,
  candidates,
  onClose,
  onSubmit,
}: {
  open: boolean;
  candidates: Account[];
  onClose: () => void;
  onSubmit: (userCode: string, joinedOn: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [userCode, setUserCode] = useState("");
  const [joinedOn, setJoinedOn] = useState(today);
  const [busy, setBusy] = useState(false);
  const chosen = userCode || candidates[0]?.code || "";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!chosen) return;
    setBusy(true);
    const added = await onSubmit(chosen, joinedOn);
    setBusy(false);
    if (added) {
      setUserCode("");
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogTitle>{t("planMembers.addTitle")}</DialogTitle>
        <DialogDescription>{t("planMembers.addBody")}</DialogDescription>
        <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <SelectField label={t("planMembers.member")} value={chosen} onChange={(event) => setUserCode(event.target.value)}>
            {candidates.map((account) => (
              <option key={account.code} value={account.code}>
                {account.display_name} (@{account.username})
              </option>
            ))}
          </SelectField>
          <TextField label={t("planMembers.joinedOn")} type="date" value={joinedOn} max={today()} onChange={(event) => setJoinedOn(event.target.value)} />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="text">{t("confirm.cancel")}</Button>
            </DialogClose>
            <Button type="submit" disabled={busy || !chosen}>
              <UserPlus aria-hidden="true" />
              {t("planMembers.add")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LeaveDialog({
  member,
  onClose,
  onSubmit,
}: {
  member: Member | null;
  onClose: () => void;
  onSubmit: (member: Member, leftOn: string) => Promise<boolean>;
}) {
  const { t } = useTranslation();
  const [leftOn, setLeftOn] = useState(today);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!member) return;
    setBusy(true);
    const left = await onSubmit(member, leftOn);
    setBusy(false);
    if (left) onClose();
  };

  return (
    <Dialog open={member !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogTitle>{t("planMembers.leaveTitle", { user: member?.user.display_name ?? "" })}</DialogTitle>
        <DialogDescription>{t("planMembers.leaveBody")}</DialogDescription>
        <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
          <TextField
            label={t("planMembers.leftOn")}
            type="date"
            value={leftOn}
            min={member?.joined_on}
            max={today()}
            onChange={(event) => setLeftOn(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <DialogClose asChild>
              <Button variant="text">{t("confirm.cancel")}</Button>
            </DialogClose>
            <Button type="submit" variant="error" disabled={busy}>
              <LogOut aria-hidden="true" />
              {t("planMembers.leave")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
