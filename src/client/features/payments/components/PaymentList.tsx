import type { Payment } from "../../../../shared/types";
import { Card } from "../../../components/ui/card";
import { PaymentRow } from "./PaymentRow";

export function PaymentList({ title, payments }: { title: string; payments: Payment[] }) {
  if (payments.length === 0) return null;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-border">
          {payments.map((payment) => (
            <PaymentRow key={payment.code} payment={payment} />
          ))}
        </ul>
      </Card>
    </section>
  );
}
