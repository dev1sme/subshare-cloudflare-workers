import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Plan } from "../../../shared/types";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

const loadPlans = () => api.admin.plans();

export function usePlansAdmin() {
  const { t } = useTranslation();
  const { data, error, loading, reload, setData } = useResource(loadPlans);

  const setAccepting = useCallback(
    async (plan: Plan, accepting: boolean) => {
      const result = await api.admin.setAcceptingRequests(plan.code, accepting);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      const updated = result.data.plan;
      setData((current) => ({ plans: current.plans.map((p) => (p.code === updated.code ? updated : p)) }));
      toast.success(t(accepting ? "plansAdmin.openedToast" : "plansAdmin.closedToast", { plan: plan.name }));
      return true;
    },
    [setData, t],
  );

  return { plans: data?.plans ?? [], error, loading: loading && !data, reload, setAccepting };
}
