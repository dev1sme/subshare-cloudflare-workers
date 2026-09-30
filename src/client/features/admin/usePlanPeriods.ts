import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { formatPeriod } from "../../format";
import { useResource } from "../../hooks/useResource";

// Billing periods of one plan, newest first. Creating the current month is idempotent on the
// server: a second click returns the existing period untouched (docs/api.md).
export function usePlanPeriods(planCode: string) {
  const { t } = useTranslation();
  const load = useCallback(() => api.admin.planPeriods(planCode), [planCode]);
  const { data, error, loading, reload } = useResource(load);

  const createCurrent = useCallback(async () => {
    const result = await api.admin.createPeriod(planCode);
    if (!result.ok) {
      toast.error(errorMessage(t, result.code));
      return false;
    }
    const period = formatPeriod(result.data.period.period);
    if (result.data.created) {
      toast.success(t("planPeriods.createdToast", { period, count: result.data.period.payment_count }));
      reload();
    } else {
      toast.success(t("planPeriods.existsToast", { period }));
    }
    return true;
  }, [planCode, reload, t]);

  return { periods: data?.periods ?? [], error, loading: loading && !data, reload, createCurrent };
}
