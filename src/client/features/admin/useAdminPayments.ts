import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Payment, Prepayment } from "../../../shared/types";
import { type ApiResult, api } from "../../api";
import { errorMessage } from "../../errors";
import { useInFlight } from "../../hooks/useInFlight";
import { useResource } from "../../hooks/useResource";

// Three views of the money rows (docs/payments.md): what members reported and waits for the bank
// statement, what is still unpaid in a period, and what was confirmed in a period.
export type PaymentsView = "pending" | "unpaid" | "paid";

export type ReviewItem = { kind: "payment"; code: string; row: Payment } | { kind: "prepayment"; code: string; row: Prepayment };

const asPayment = (row: Payment): ReviewItem => ({ kind: "payment", code: row.code, row });
const asPrepayment = (row: Prepayment): ReviewItem => ({ kind: "prepayment", code: row.code, row });

// Reported first is checked first, like the join-request queue.
const byReportedAt = (a: ReviewItem, b: ReviewItem) => (a.row.marked_at ?? "").localeCompare(b.row.marked_at ?? "");

async function loadView(view: PaymentsView, period: string): Promise<ApiResult<{ items: ReviewItem[] }>> {
  if (view === "pending") {
    const [payments, prepayments] = await Promise.all([api.admin.payments("PENDING"), api.admin.prepayments("PENDING")]);
    if (!payments.ok) return payments;
    if (!prepayments.ok) return prepayments;
    const items = [...payments.data.payments.map(asPayment), ...prepayments.data.prepayments.map(asPrepayment)];
    return { ok: true, data: { items: items.sort(byReportedAt) } };
  }
  const result = await api.admin.payments(view === "unpaid" ? "UNPAID" : "PAID", period);
  if (!result.ok) return result;
  return { ok: true, data: { items: result.data.payments.map(asPayment) } };
}

export function useAdminPayments(view: PaymentsView, period: string) {
  const { t } = useTranslation();
  const load = useCallback(() => loadView(view, period), [view, period]);
  const { data, error, loading, reload, setData } = useResource(load);
  // Rows with a request in flight: their buttons are disabled, and a double click sends one request.
  const { busy, start, finish } = useInFlight();

  // A row whose status changed no longer belongs to this view: it leaves the list (and animates
  // out). A refusal usually means another admin moved it first, so the list is refetched.
  const setStatus = useCallback(
    async (item: ReviewItem, to: "PAID" | "UNPAID") => {
      if (!start(item.code)) return false;
      const result =
        item.kind === "payment"
          ? await api.admin.setPaymentStatus(item.code, to)
          : await api.admin.setPrepaymentStatus(item.code, to);
      finish(item.code);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        reload();
        return false;
      }
      setData((current) => ({ items: current.items.filter((other) => other.code !== item.code) }));
      toast.success(t(to === "PAID" ? "paymentsAdmin.confirmedToast" : "paymentsAdmin.revertedToast", { user: item.row.user.display_name }));
      return true;
    },
    [finish, reload, setData, start, t],
  );

  const items = data?.items ?? [];
  return {
    items,
    total: items.reduce((sum, item) => sum + item.row.amount, 0),
    error,
    // A view or period change refetches: show the skeleton rather than the previous view's rows.
    loading,
    reload,
    busy,
    setStatus,
  };
}
