import { cn } from "../lib/cn";

// The SubShare mark: an S drawn as two halves — "Sub" in ink, "Share" in the brand colour. Same
// geometry as public/favicon.svg (which needs literal colours). Decorative: the name follows it.
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} fill="none" strokeWidth={4.5} strokeLinecap="round" aria-hidden="true">
      <path d="M21.17 8.62 A5.5 5.5 0 1 0 16 16" className="stroke-on-surface" />
      <path d="M16 16 A5.5 5.5 0 1 1 10.83 23.38" className="stroke-primary" />
    </svg>
  );
}
