import { cn } from "../lib/cn";

// The SubShare mark: an S whose two ends are arrows — "Sub" and "Share", renewed every month and
// paid into from both sides — on a teal app-icon tile, so it reads on light and dark alike. Same
// geometry as public/favicon.svg (which needs literal colours). Decorative: the name follows it.
export function BrandLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden="true">
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <g transform="translate(16 16) scale(0.8) translate(-16 -16)" fill="none" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21.17 8.62 A5.5 5.5 0 1 0 16 16 M23.13 5.74 L21.44 9.37 L17.81 7.68" className="stroke-on-primary" />
        <path d="M16 16 A5.5 5.5 0 1 1 10.83 23.38 M8.87 26.26 L10.56 22.63 L14.19 24.32" className="stroke-primary-container" />
      </g>
    </svg>
  );
}
