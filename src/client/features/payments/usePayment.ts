import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

export function usePayment(code: string) {
  const { t } = useTranslation();
  const load = useCallback(() => api.me.payment(code), [code]);
  const { data, error, loading, reload, setData } = useResource(load);

  // UNPAID -> PENDING. Resolves true on success; failures raise their own toast.
  const markSent = useCallback(async () => {
    const result = await api.me.markPaymentSent(code);
    if (!result.ok) {
      toast.error(errorMessage(t, result.code));
      // The status moved under us (an admin confirmed it meanwhile): show the real state.
      if (result.code === "INVALID_STATUS_TRANSITION") reload();
      return false;
    }
    setData((current) => ({ ...current, payment: result.data.payment }));
    toast.success(t("payments.markSentDone"));
    return true;
  }, [code, reload, setData, t]);

  return {
    payment: data?.payment ?? null,
    transfer: data?.bank_transfer ?? null,
    error,
    loading,
    reload,
    markSent,
  };
}
