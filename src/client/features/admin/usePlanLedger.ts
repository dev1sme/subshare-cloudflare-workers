import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Member, Payment, Prepayment } from "../../../shared/types";
import { type ApiResult, api } from "../../api";
import { errorMessage } from "../../errors";
import { useInFlight } from "../../hooks/useInFlight";
import { useResource } from "../../hooks/useResource";

// What one member owes and has paid in one plan.
export type MemberLedger = {
  // Newest period first (the API's order).
  payments: Payment[];
  // Newest first; only prepayments of this plan.
  prepayments: Prepayment[];
  // The furthest month known to be paid: a PAID period, or the end of a PAID prepayment (which
  // may run past the periods created so far). Null when nothing was ever paid.
  paidThrough: string | null;
  unpaidCount: number;
  unpaidTotal: number;
  pendingCount: number;
  // UNPAID or PENDING prepayments: started, not settled.
  openPrepayments: Prepayment[];
};

type LedgerData = { payments: Payment[]; prepayments: Prepayment[] };

const EMPTY: MemberLedger = {
  payments: [],
  prepayments: [],
  paidThrough: null,
  unpaidCount: 0,
  unpaidTotal: 0,
  pendingCount: 0,
  openPrepayments: [],
};

async function loadLedger(planCode: string): Promise<ApiResult<LedgerData>> {
  const [payments, prepayments] = await Promise.all([api.admin.planPayments(planCode), api.admin.planPrepayments(planCode)]);
  if (!payments.ok) return payments;
  if (!prepayments.ok) return prepayments;
  return { ok: true, data: { payments: payments.data.payments, prepayments: prepayments.data.prepayments } };
}

function buildLedgers({ payments, prepayments }: LedgerData): Map<string, MemberLedger> {
  const ledgers = new Map<string, MemberLedger>();
  const ledgerOf = (userCode: string) => {
    let ledger = ledgers.get(userCode);
    if (!ledger) {
      ledger = { ...EMPTY, payments: [], prepayments: [], openPrepayments: [] };
      ledgers.set(userCode, ledger);
    }
    return ledger;
  };
  const later = (a: string | null, b: string) => (a === null || b > a ? b : a);
  for (const payment of payments) {
    const ledger = ledgerOf(payment.user.code);
    ledger.payments.push(payment);
    if (payment.status === "PAID") ledger.paidThrough = later(ledger.paidThrough, payment.period);
    else if (payment.status === "PENDING") ledger.pendingCount += 1;
    else {
      ledger.unpaidCount += 1;
      ledger.unpaidTotal += payment.amount;
    }
  }
  for (const prepayment of prepayments) {
    const ledger = ledgerOf(prepayment.user.code);
    ledger.prepayments.push(prepayment);
    if (prepayment.status === "PAID") ledger.paidThrough = later(ledger.paidThrough, prepayment.end_period);
    else ledger.openPrepayments.push(prepayment);
  }
  return ledgers;
}

// Every payment and prepayment of one plan, grouped by member, for the plan's members section.
export function usePlanLedger(planCode: string) {
  const { t } = useTranslation();
  const load = useCallback(() => loadLedger(planCode), [planCode]);
  const { data, error, loading, reload, setData } = useResource(load);
  const { busy, start, finish } = useInFlight();
  const ledgers = useMemo(() => (data ? buildLedgers(data) : new Map<string, MemberLedger>()), [data]);

  const ledgerOf = useCallback((userCode: string) => ledgers.get(userCode) ?? EMPTY, [ledgers]);

  // "Money received" on one unsettled period, outside the review screen.
  const markReceived = useCallback(
    async (payment: Payment) => {
      if (!start(payment.code)) return false;
      const result = await api.admin.setPaymentStatus(payment.code, "PAID");
      finish(payment.code);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        reload();
        return false;
      }
      setData((current) => ({
        ...current,
        payments: current.payments.map((row) => (row.code === payment.code ? result.data.payment : row)),
      }));
      toast.success(t("paymentsAdmin.confirmedToast", { user: payment.user.display_name }));
      return true;
    },
    [finish, reload, setData, start, t],
  );

  // The rows it settles are refetched rather than patched: which months exist is the server's to say.
  const recordPaid = useCallback(
    async (member: Member, from: string, to: string) => {
      const result = await api.admin.recordPaid(member.code, from, to);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      reload();
      toast.success(t("recordPaid.doneToast", { user: member.user.display_name, months: result.data.prepayment.months }));
      return true;
    },
    [reload, t],
  );

  return { ledgerOf, error, loading: loading && !data, reload, busy, markReceived, recordPaid };
}
