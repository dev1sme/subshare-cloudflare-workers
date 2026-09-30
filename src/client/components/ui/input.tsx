import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// text-base (16px) keeps iOS Safari from zooming in when the field takes focus.
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-lg border border-input bg-card px-3 text-base transition-colors duration-200 placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ring/30 disabled:opacity-50 aria-invalid:border-destructive",
        className,
      )}
      {...props}
    />
  );
}
