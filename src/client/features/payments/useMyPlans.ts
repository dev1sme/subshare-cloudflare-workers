import { useCallback, useMemo } from "react";
import type { MyPlan, Payment, Prepayment } from "../../../shared/types";
import { type ApiResult, api } from "../../api";
import { useResource } from "../../hooks/useResource";

type PlanRef = Payment["plan"];

// One card on the home screen: a plan the member is in, or one they left but still owe for.
export type MyPlanSummary = {
  plan: PlanRef;
  // Null for a plan the member has left: only its unsettled payments bring it here.
  memberAmount: number | null;
  // UNPAID and PENDING payments, newest period first (the API's order).
  open: Payment[];
  // The furthest month paid, to say "paid up to": a PAID period, or the end of a PAID prepayment
  // (which runs past the periods created so far — e.g. months an admin recorded as paid).
  paidThrough: string | null;
  // UNPAID and PENDING prepayments: started, not yet confirmed.
  prepayments: Prepayment[];
};

type HomeData = { plans: MyPlan[]; payments: Payment[]; prepayments: Prepayment[] };

// The reads go out together; the screen needs all of them before it can draw a card.
async function loadHome(): Promise<ApiResult<HomeData>> {
  const [plans, payments, prepayments] = await Promise.all([api.me.plans(), api.me.payments(), api.me.prepayments()]);
  if (!plans.ok) return plans;
  if (!payments.ok) return payments;
  if (!prepayments.ok) return prepayments;
  return {
    ok: true,
    data: { plans: plans.data.plans, payments: payments.data.payments, prepayments: prepayments.data.prepayments },
  };
}

export function useMyPlans() {
  const load = useCallback(loadHome, []);
  const { data, error, loading, reload } = useResource(load);

  const summary = useMemo(() => {
    // A month inside a prepayment the member reported as sent is not "to transfer" any more: the
    // money is on its way with the prepayment. An UNPAID prepayment changes nothing — it may be dropped.
    const sent = (data?.prepayments ?? []).filter((prepayment) => prepayment.status === "PENDING");
    const inSentPrepayment = (payment: Payment) =>
      payment.status === "UNPAID" &&
      sent.some((p) => p.plan.code === payment.plan.code && p.start_period <= payment.period && payment.period <= p.end_period);
    const payments = (data?.payments ?? []).filter((payment) => !inSentPrepayment(payment));
    const cards = new Map<string, MyPlanSummary>();
    for (const plan of data?.plans ?? []) {
      cards.set(plan.code, {
        plan: { code: plan.code, name: plan.name, provider: plan.provider },
        memberAmount: plan.member_amount,
        open: [],
        paidThrough: null,
        prepayments: [],
      });
    }
    for (const payment of payments) {
      let card = cards.get(payment.plan.code);
      if (!card) {
        // A plan the member left: shown only while something is still owed on it.
        if (payment.status === "PAID") continue;
        card = { plan: payment.plan, memberAmount: null, open: [], paidThrough: null, prepayments: [] };
        cards.set(payment.plan.code, card);
      }
      if (payment.status === "PAID") {
        if (!card.paidThrough || payment.period > card.paidThrough) card.paidThrough = payment.period;
      } else {
        card.open.push(payment);
      }
    }
    // Only for plans the member still sits in: a prepayment needs a seat to be made or paid.
    for (const prepayment of data?.prepayments ?? []) {
      const card = cards.get(prepayment.plan.code);
      if (!card) continue;
      if (prepayment.status !== "PAID") card.prepayments.push(prepayment);
      else if (!card.paidThrough || prepayment.end_period > card.paidThrough) card.paidThrough = prepayment.end_period;
    }
    // An unpaid prepayment is an offer the member may still drop, not a debt: it stays out of the
    // totals. A sent one waits for the admin like a sent payment does.
    const sum = (list: { amount: number }[]) => list.reduce((total, row) => total + row.amount, 0);
    return {
      plans: [...cards.values()],
      history: payments.filter((payment) => payment.status === "PAID"),
      // Two numbers, not one: "still to transfer" and "sent, waiting for the admin" ask
      // different things of the member.
      unpaidTotal: sum(payments.filter((payment) => payment.status === "UNPAID")),
      pendingTotal: sum(payments.filter((payment) => payment.status === "PENDING")) + sum(sent),
      empty: payments.length === 0 && (data?.plans.length ?? 0) === 0,
    };
  }, [data]);

  return { ...summary, error, loading, reload };
}
