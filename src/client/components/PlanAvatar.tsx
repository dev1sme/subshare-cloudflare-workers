import { cn } from "../lib/cn";
import { initials } from "../lib/initials";

// M3 Expressive "contrasting shapes": each plan gets a stable shape + tonal colour picked from
// its code, so a plan looks the same on every screen. Initials only — never a brand logo.
const TONES = [
  "bg-primary-container text-on-primary-container",
  "bg-secondary-container text-on-secondary-container",
  "bg-tertiary-container text-on-tertiary-container",
  "bg-success-container text-on-success-container",
  "bg-warning-container text-on-warning-container",
];
const SHAPES = ["rounded-2xl", "rounded-full", "rounded-[40%_60%_60%_40%/40%_40%_60%_60%]", "rounded-[1.25rem_0.5rem]"];

function hash(value: string): number {
  let h = 0;
  for (const char of value) h = (h * 31 + char.charCodeAt(0)) >>> 0;
  return h;
}

export function PlanAvatar({ code, name, className }: { code: string; name: string; className?: string }) {
  const h = hash(code);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center text-base font-bold",
        TONES[h % TONES.length],
        SHAPES[(h >> 3) % SHAPES.length],
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
