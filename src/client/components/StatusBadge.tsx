import { CircleCheck, CircleDashed, Clock } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import type { PaymentStatus } from "../../shared/types";
import { cn } from "../lib/cn";
import { springExpressive } from "../lib/motion";

const STYLE: Record<PaymentStatus, { className: string; icon: typeof Clock }> = {
  UNPAID: { className: "bg-error-container text-on-error-container", icon: CircleDashed },
  PENDING: { className: "bg-warning-container text-on-warning-container", icon: Clock },
  PAID: { className: "bg-success-container text-on-success-container", icon: CircleCheck },
};

// Status is carried by the text and the icon, not by colour alone. A change pops the new
// label in, so a member sees their "sent" register.
export function StatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const { t } = useTranslation();
  const { className: tone, icon: Icon } = STYLE[status];
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <m.span
        key={status}
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1, transition: springExpressive }}
        exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.12 } }}
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap",
          tone,
          className,
        )}
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {t(`status.${status}`)}
      </m.span>
    </AnimatePresence>
  );
}
