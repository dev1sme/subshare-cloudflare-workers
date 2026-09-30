import { m } from "motion/react";
import { cn } from "../lib/cn";
import { listItem, listStagger } from "../lib/motion";

// One pill per seat: filled = taken, outlined = free. The numbers are said in text next to it;
// the meter itself is decorative.
export function SlotMeter({ used, total, className }: { used: number; total: number; className?: string }) {
  return (
    <m.span
      aria-hidden="true"
      variants={listStagger}
      initial="hidden"
      animate="visible"
      className={cn("flex gap-1", className)}
    >
      {Array.from({ length: total }, (_, seat) => (
        <m.span
          key={seat}
          variants={listItem}
          className={cn("h-2 w-5 rounded-full", seat < used ? "bg-primary" : "border border-outline-variant bg-surface-container-highest")}
        />
      ))}
    </m.span>
  );
}
