import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

export function usePrepayment(code: string) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const load = useCallback(() => api.me.prepayment(code), [code]);
  const { data, error, loading, reload, setData } = useResource(load);

  // UNPAID -> PENDING. Resolves true on success; failures raise their own toast.
  const markSent = useCallback(async () => {
    const result = await api.me.markPrepaymentSent(code);
    if (!result.ok) {
      toast.error(errorMessage(t, result.code));
      // The status moved under us (an admin acted meanwhile): show the real state.
      if (result.code === "INVALID_STATUS_TRANSITION") reload();
      return false;
    }
    setData((current) => ({ ...current, prepayment: result.data.prepayment }));
    toast.success(t("payments.markSentDone"));
    return true;
  }, [code, reload, setData, t]);

  // Only while UNPAID (the member has not reported a transfer). Back to the home screen after.
  const remove = useCallback(async () => {
    const result = await api.me.deletePrepayment(code);
    if (!result.ok) {
      toast.error(errorMessage(t, result.code));
      if (result.code === "CANNOT_DELETE_PREPAYMENT") reload();
      return false;
    }
    toast.success(t("prepay.deletedToast"));
    navigate("/payments", { replace: true });
    return true;
  }, [code, navigate, reload, t]);

  return {
    prepayment: data?.prepayment ?? null,
    transfer: data?.bank_transfer ?? null,
    error,
    loading,
    reload,
    markSent,
    remove,
  };
}
