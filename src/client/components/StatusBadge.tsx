import { CircleCheck, CircleDashed, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { PaymentStatus } from "../../shared/types";
import { cn } from "../lib/cn";

const STYLE: Record<PaymentStatus, { className: string; icon: typeof Clock }> = {
  UNPAID: { className: "bg-owed-soft text-owed", icon: CircleDashed },
  PENDING: { className: "bg-pending-soft text-pending", icon: Clock },
  PAID: { className: "bg-paid-soft text-paid", icon: CircleCheck },
};

// Status is carried by the text and the icon, not by colour alone.
export function StatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const { t } = useTranslation();
  const { className: tone, icon: Icon } = STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {t(`status.${status}`)}
    </span>
  );
}
