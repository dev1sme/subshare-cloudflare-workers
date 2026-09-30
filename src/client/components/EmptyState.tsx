import { CircleAlert, CircleCheck, Compass, Layers, SearchX, type LucideIcon } from "lucide-react";
import { m } from "motion/react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { emphasizedDecelerate } from "../lib/motion";

type Tone = "neutral" | "success" | "error";

// Named so a screen says what it is about, not which picture it wants.
const ICONS = {
  plans: Layers,
  explore: Compass,
  done: CircleCheck,
  error: CircleAlert,
  missing: SearchX,
} satisfies Record<string, LucideIcon>;

const TONE: Record<Tone, string> = {
  neutral: "bg-secondary-container text-on-secondary-container",
  success: "bg-success-container text-on-success-container",
  error: "bg-error-container text-on-error-container",
};

// Empty / result state: one icon that says what the screen is about, then the message. The icon
// is decorative; title and body carry the meaning. It fades in with the text, nothing bounces.
export function EmptyState({
  tone = "neutral",
  icon = "plans",
  title,
  body,
  children,
}: {
  tone?: Tone;
  icon?: keyof typeof ICONS;
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  const Icon = ICONS[icon];
  return (
    <m.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: emphasizedDecelerate } }}
      className="flex flex-col items-center gap-3 py-10 text-center"
    >
      <span aria-hidden="true" className={cn("mb-1 flex size-16 items-center justify-center rounded-3xl", TONE[tone])}>
        <Icon className="size-8" strokeWidth={1.75} />
      </span>
      <p className="text-lg font-semibold">{title}</p>
      {body && <p className="max-w-xs text-sm text-on-surface-variant">{body}</p>}
      {children}
    </m.div>
  );
}
