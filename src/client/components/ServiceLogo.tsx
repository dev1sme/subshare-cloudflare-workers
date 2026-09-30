import { m } from "motion/react";
import type { Provider } from "../../shared/providers";
import { cn } from "../lib/cn";
import { initials } from "../lib/initials";
import { PROVIDER_STYLE } from "../lib/providers";
import { spring } from "../lib/motion";

type ServiceLogoProps = {
  provider: Provider;
  // Used for the initials when the provider has no logo (OTHER, or a brand without one).
  name: string;
  className?: string;
  // Shared-layout id: the same logo on the list and on the detail screen morphs between them.
  layoutId?: string;
};

// An app-icon tile: the brand's logo in its own colour on white. Decorative — the plan name next to
// it always carries the meaning. Brand hex is the one allowed raw colour besides QrCode, set as an
// SVG attribute / CSSOM style (both fine under style-src 'self').
export function ServiceLogo({ provider, name, className, layoutId }: ServiceLogoProps) {
  const style = PROVIDER_STYLE[provider];
  return (
    <m.span
      layoutId={layoutId}
      transition={spring}
      aria-hidden="true"
      className={cn(
        "flex size-12 shrink-0 items-center justify-center rounded-2xl border border-outline-variant/60 bg-surface-container-lowest text-base font-bold",
        !style.color && "border-transparent bg-secondary-container text-on-secondary-container",
        className,
      )}
      style={style.color ? { color: style.color } : undefined}
    >
      {style.path ? (
        <svg viewBox="0 0 24 24" className="size-[55%]" fill="currentColor">
          <path d={style.path} />
        </svg>
      ) : (
        initials(style.label ?? name)
      )}
    </m.span>
  );
}
