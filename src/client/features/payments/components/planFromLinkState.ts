import type { Payment } from "../../../../shared/types";

// The plan the home card linked from, if any — a hint for drawing the header early, never trusted
// over the loaded payment or prepayment.
export function planFromLinkState(state: unknown): Payment["plan"] | null {
  const plan = (state as { plan?: Payment["plan"] } | null)?.plan;
  return plan && typeof plan.code === "string" && typeof plan.name === "string" ? plan : null;
}
