import { AlertDialog as AlertDialogPrimitive } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { buttonVariants } from "./button";

export const AlertDialog = AlertDialogPrimitive.Root;

// Enter/exit are CSS keyframes keyed on Radix's data-state; Radix keeps the node mounted until
// the exit animation ends, so closing animates too (tokens in index.css).
export function AlertDialogContent({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Content>) {
  return (
    <AlertDialogPrimitive.Portal>
      <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-on-surface/32 data-[state=closed]:animate-scrim-out data-[state=open]:animate-scrim-in" />
      <AlertDialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 grid w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 gap-4 rounded-card bg-surface-container-high p-6 data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in",
          className,
        )}
        {...props}
      />
    </AlertDialogPrimitive.Portal>
  );
}

export function AlertDialogTitle({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Title>) {
  return <AlertDialogPrimitive.Title className={cn("text-2xl font-semibold", className)} {...props} />;
}

export function AlertDialogDescription({
  className,
  ...props
}: ComponentProps<typeof AlertDialogPrimitive.Description>) {
  return <AlertDialogPrimitive.Description className={cn("text-sm text-on-surface-variant", className)} {...props} />;
}

// M3 dialogs put text buttons at the end, side by side, the confirming action last.
export function AlertDialogFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-2 flex flex-wrap justify-end gap-2", className)} {...props} />;
}

type ActionProps = ComponentProps<typeof AlertDialogPrimitive.Action> & { destructive?: boolean };

export function AlertDialogAction({ className, destructive = false, ...props }: ActionProps) {
  return (
    <AlertDialogPrimitive.Action
      className={cn(buttonVariants({ variant: destructive ? "error" : "filled" }), className)}
      {...props}
    />
  );
}

export function AlertDialogCancel({ className, ...props }: ComponentProps<typeof AlertDialogPrimitive.Cancel>) {
  return <AlertDialogPrimitive.Cancel className={cn(buttonVariants({ variant: "text" }), className)} {...props} />;
}
