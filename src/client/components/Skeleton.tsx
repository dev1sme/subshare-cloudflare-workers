import { cn } from "../lib/cn";

// Placeholder that reserves the loaded content's space, so nothing jumps when data arrives.
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} />;
}
