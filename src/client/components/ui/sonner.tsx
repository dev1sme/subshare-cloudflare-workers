import { Toaster as SonnerToaster } from "sonner";

// Styled as an M3 snackbar: inverse surface, rounded, at the bottom where the thumb is.
// Mounted once in main.tsx. Callers use toast.success / toast.error, never a bare toast().
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-center"
      offset={{ bottom: 96 }}
      mobileOffset={{ bottom: 96 }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-2xl bg-inverse-surface px-4 py-3 font-sans text-sm text-inverse-on-surface shadow-lg",
          icon: "shrink-0",
          success: "[&_[data-icon]]:text-success-container",
          error: "[&_[data-icon]]:text-error-container",
          closeButton: "order-last",
        },
      }}
    />
  );
}
