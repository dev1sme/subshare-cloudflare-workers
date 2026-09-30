import { type VariantProps, cva } from "class-variance-authority";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";

// M3 buttons: pill-shaped, state layer for hover/press instead of a darker fill, and a short
// press-in (scale 0.97) so a tap is felt. min-h-11 / w-11 = 44px touch target.
export const buttonVariants = cva(
  "state-layer relative inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-semibold tracking-wide whitespace-nowrap transition-[transform,background-color,box-shadow] duration-200 ease-emphasized select-none active:scale-[0.97] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        filled: "bg-primary text-on-primary hover:shadow-md hover:shadow-primary/20",
        tonal: "bg-secondary-container text-on-secondary-container",
        outlined: "border border-outline-variant text-primary",
        text: "px-3 text-primary",
        error: "bg-error text-on-error",
        icon: "px-0 text-on-surface-variant",
      },
      size: {
        default: "",
        large: "min-h-14 px-8 text-base",
        icon: "w-11 px-0",
      },
    },
    defaultVariants: { variant: "filled", size: "default" },
  },
);

type ButtonProps = ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({ className, variant, size, asChild = false, type, ...props }: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      // A plain <button> inside a form submits it by default; opt in to that explicitly.
      type={asChild ? undefined : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
