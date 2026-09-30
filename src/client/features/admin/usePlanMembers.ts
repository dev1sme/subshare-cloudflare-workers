import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Account, Member } from "../../../shared/types";
import { type ApiResult, api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

type MembersData = { members: Member[]; accounts: Account[] };

async function loadMembers(planCode: string): Promise<ApiResult<MembersData>> {
  const [members, accounts] = await Promise.all([api.admin.planMembers(planCode), api.admin.accounts()]);
  if (!members.ok) return members;
  if (!accounts.ok) return accounts;
  return { ok: true, data: { members: members.data.members, accounts: accounts.data.accounts } };
}

// Seats of one plan. Adding and leaving are checked by the server (seat limit inside the INSERT,
// payer never seated, one active seat per person); the list is refetched after each change so
// the order (active first, by join date) stays the server's.
export function usePlanMembers(planCode: string, payerCode: string | null) {
  const { t } = useTranslation();
  const load = useCallback(() => loadMembers(planCode), [planCode]);
  const { data, error, loading, reload } = useResource(load);

  const members = data?.members ?? [];
  const seated = new Set(members.filter((member) => member.left_on === null).map((member) => member.user.code));
  // Who can be added: not already seated, not the plan's payer.
  const candidates = (data?.accounts ?? []).filter((account) => !seated.has(account.code) && account.code !== payerCode);

  const add = useCallback(
    async (userCode: string, joinedOn: string) => {
      const result = await api.admin.addMember(planCode, userCode, joinedOn);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      toast.success(t("planMembers.addedToast", { user: result.data.member.user.display_name }));
      reload();
      return true;
    },
    [planCode, reload, t],
  );

  const leave = useCallback(
    async (member: Member, leftOn: string) => {
      const result = await api.admin.leaveMember(member.code, leftOn);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      toast.success(t("planMembers.leftToast", { user: member.user.display_name }));
      reload();
      return true;
    },
    [reload, t],
  );

  return { members, candidates, error, loading: loading && !data, reload, add, leave };
}
