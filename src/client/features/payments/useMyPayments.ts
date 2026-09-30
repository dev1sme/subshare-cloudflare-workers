import { useCallback, useMemo } from "react";
import type { Payment } from "../../../shared/types";
import { api } from "../../api";
import { useResource } from "../../hooks/useResource";

export function useMyPayments() {
  const load = useCallback(() => api.me.payments(), []);
  const { data, error, loading, reload } = useResource(load);

  // The API already orders unsettled first, newest period first.
  const { due, paid, totalDue } = useMemo(() => {
    const payments: Payment[] = data?.payments ?? [];
    const due = payments.filter((payment) => payment.status !== "PAID");
    return {
      due,
      paid: payments.filter((payment) => payment.status === "PAID"),
      // PENDING is still owed until an admin confirms it.
      totalDue: due.reduce((sum, payment) => sum + payment.amount, 0),
    };
  }, [data]);

  return { due, paid, totalDue, error, loading, reload };
}
