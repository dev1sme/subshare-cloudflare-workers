import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// M3 uses tonal elevation: a lighter/darker surface container instead of a drop shadow.
export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("rounded-card bg-surface-container-low text-on-surface", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5", className)} {...props} />;
}
