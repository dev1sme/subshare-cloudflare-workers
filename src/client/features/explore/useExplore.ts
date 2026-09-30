import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { type ApiResult, api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";
import { useWishes } from "./WishesProvider";
import type { JoinRequest, OpenPlan } from "../../../shared/types";

type Explore = { plans: OpenPlan[]; requests: JoinRequest[] };

// Both lists load together; the screen is useless with only one of them.
async function loadExplore(): Promise<ApiResult<Explore>> {
  const [plans, requests] = await Promise.all([api.me.openPlans(), api.me.joinRequests()]);
  if (!plans.ok) return plans;
  if (!requests.ok) return requests;
  return { ok: true, data: { plans: plans.data.plans, requests: requests.data.join_requests } };
}

export function useExplore() {
  const { t } = useTranslation();
  const { data, error, loading, reload } = useResource(loadExplore);
  // Asking to join a plan opened for a wish changes that wish's notice too.
  const { reload: reloadWishes } = useWishes();

  // Mutations resolve true on success and raise their own toast; the lists reload either way,
  // since a refusal (plan full, closed meanwhile) usually means the list is stale.
  const ask = useCallback(
    async (planCode: string, note: string) => {
      const result = await api.me.askToJoin(planCode, note.trim());
      reload();
      reloadWishes();
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      toast.success(t("explore.sent"));
      return true;
    },
    [reload, reloadWishes, t],
  );

  const cancel = useCallback(
    async (requestCode: string) => {
      const result = await api.me.cancelJoinRequest(requestCode);
      reload();
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      toast.success(t("explore.cancelDone"));
      return true;
    },
    [reload, t],
  );

  return { plans: data?.plans ?? [], requests: data?.requests ?? [], error, loading: loading && !data, reload, ask, cancel };
}
