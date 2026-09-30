import { useCallback, useMemo } from "react";
import type { MyPlan, Payment } from "../../../shared/types";
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
  // The latest settled period, to say "paid up to".
  lastPaid: Payment | null;
};

type HomeData = { plans: MyPlan[]; payments: Payment[] };

// Both reads go out together; the screen needs both before it can draw a card.
async function loadHome(): Promise<ApiResult<HomeData>> {
  const [plans, payments] = await Promise.all([api.me.plans(), api.me.payments()]);
  if (!plans.ok) return plans;
  if (!payments.ok) return payments;
  return { ok: true, data: { plans: plans.data.plans, payments: payments.data.payments } };
}

export function useMyPlans() {
  const load = useCallback(loadHome, []);
  const { data, error, loading, reload } = useResource(load);

  const summary = useMemo(() => {
    const payments = data?.payments ?? [];
    const cards = new Map<string, MyPlanSummary>();
    for (const plan of data?.plans ?? []) {
      cards.set(plan.code, {
        plan: { code: plan.code, name: plan.name, provider: plan.provider },
        memberAmount: plan.member_amount,
        open: [],
        lastPaid: null,
      });
    }
    for (const payment of payments) {
      let card = cards.get(payment.plan.code);
      if (!card) {
        // A plan the member left: shown only while something is still owed on it.
        if (payment.status === "PAID") continue;
        card = { plan: payment.plan, memberAmount: null, open: [], lastPaid: null };
        cards.set(payment.plan.code, card);
      }
      if (payment.status === "PAID") {
        if (!card.lastPaid || payment.period > card.lastPaid.period) card.lastPaid = payment;
      } else {
        card.open.push(payment);
      }
    }
    const sum = (list: Payment[]) => list.reduce((total, payment) => total + payment.amount, 0);
    return {
      plans: [...cards.values()],
      history: payments.filter((payment) => payment.status === "PAID"),
      // Two numbers, not one: "still to transfer" and "sent, waiting for the admin" ask
      // different things of the member.
      unpaidTotal: sum(payments.filter((payment) => payment.status === "UNPAID")),
      pendingTotal: sum(payments.filter((payment) => payment.status === "PENDING")),
      empty: payments.length === 0 && (data?.plans.length ?? 0) === 0,
    };
  }, [data]);

  return { ...summary, error, loading, reload };
}
