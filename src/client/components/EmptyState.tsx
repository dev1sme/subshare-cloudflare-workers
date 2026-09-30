import { m } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { springExpressive } from "../lib/motion";

type Tone = "neutral" | "success" | "error";

const TONE: Record<Tone, { blob: string; accent: string }> = {
  neutral: { blob: "fill-primary-container", accent: "fill-tertiary-container" },
  success: { blob: "fill-success-container", accent: "fill-primary-container" },
  error: { blob: "fill-error-container", accent: "fill-secondary-container" },
};

// Illustrated empty / result state: two soft shapes that settle in, then the message.
// The illustration is decorative; the title and body carry the meaning.
export function EmptyState({
  tone = "neutral",
  title,
  body,
  children,
}: {
  tone?: Tone;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  const colors = TONE[tone];
  return (
    <div className="flex flex-col items-center gap-3 py-8 text-center">
      <svg viewBox="0 0 120 96" className="h-24 w-32" aria-hidden="true">
        <m.path
          d="M60 8c26 0 48 14 48 38S88 90 58 90 12 74 12 48 34 8 60 8z"
          className={colors.blob}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1, transition: springExpressive }}
          style={{ transformOrigin: "60px 48px" }}
        />
        <m.rect
          x="70"
          y="14"
          width="30"
          height="30"
          rx="10"
          className={colors.accent}
          initial={{ rotate: -40, scale: 0, opacity: 0 }}
          animate={{ rotate: 12, scale: 1, opacity: 1, transition: { ...springExpressive, delay: 0.1 } }}
          style={{ transformOrigin: "85px 29px" }}
        />
        <m.circle
          cx="34"
          cy="70"
          r="9"
          className={cn(colors.accent, "opacity-80")}
          initial={{ scale: 0 }}
          animate={{ scale: 1, transition: { ...springExpressive, delay: 0.18 } }}
        />
      </svg>
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="max-w-xs text-sm text-on-surface-variant">{body}</p>}
      {children}
    </div>
  );
}
