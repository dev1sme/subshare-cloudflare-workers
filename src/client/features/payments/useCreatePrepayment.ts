import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { Payment } from "../../../shared/types";
import { api } from "../../api";
import { errorMessage } from "../../errors";

// Starts a prepayment and opens its transfer screen. Resolves false when refused (toast raised).
export function useCreatePrepayment() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return useCallback(
    async (plan: Payment["plan"], months: number) => {
      const result = await api.me.createPrepayment(plan.code, months);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      // The plan rides along so the detail screen draws its header before its own request returns.
      navigate(`/prepayments/${result.data.prepayment.code}`, { state: { plan } });
      return true;
    },
    [navigate, t],
  );
}
