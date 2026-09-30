import { m } from "motion/react";
import type { Payment } from "../../../../shared/types";
import { listStagger } from "../../../lib/motion";
import { PaymentRow } from "./PaymentRow";

// Settled payments, newest first: a quiet list under the plan cards.
export function PaymentList({ title, payments }: { title: string; payments: Payment[] }) {
  if (payments.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-semibold tracking-wide text-on-surface-variant">{title}</h2>
      <m.ul variants={listStagger} initial="hidden" animate="visible" className="flex flex-col">
        {payments.map((payment) => (
          <PaymentRow key={payment.code} payment={payment} />
        ))}
      </m.ul>
    </section>
  );
}
