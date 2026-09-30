import { CircleCheck, CircleDashed, Clock } from "lucide-react";
import { m } from "motion/react";
import { useRef } from "react";
import { useTranslation } from "react-i18next";
import type { PaymentStatus } from "../../shared/types";
import { cn } from "../lib/cn";
import { spring } from "../lib/motion";

const STYLE: Record<PaymentStatus, { className: string; icon: typeof Clock }> = {
  UNPAID: { className: "bg-error-container text-on-error-container", icon: CircleDashed },
  PENDING: { className: "bg-warning-container text-on-warning-container", icon: Clock },
  PAID: { className: "bg-success-container text-on-success-container", icon: CircleCheck },
};

// Status is carried by the text and the icon, not by colour alone. On a change the pill itself
// morphs — its width follows the new label (layout) and its colour cross-fades (CSS) — while the
// label slides in from below, so "Chưa đóng" visibly becomes "Chờ xác nhận". The old label is
// dropped at once, not animated out: AnimatePresence's popLayout injects a <style> tag, which
// style-src 'self' blocks, leaving both labels in the pill.
export function StatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  const { t } = useTranslation();
  const { className: tone, icon: Icon } = STYLE[status];
  // Only a change animates; the status a badge first renders with just appears.
  const initialStatus = useRef(status);
  return (
    <m.span
      layout
      transition={spring}
      className={cn(
        "inline-flex shrink-0 items-center overflow-hidden rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap transition-colors duration-300 ease-emphasized",
        tone,
        className,
      )}
    >
      <m.span
        key={status}
        layout="position"
        initial={initialStatus.current === status ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0, transition: spring }}
        className="inline-flex items-center gap-1"
      >
        <Icon className="size-3.5" aria-hidden="true" />
        {t(`status.${status}`)}
      </m.span>
    </m.span>
  );
}
