import { Toaster as SonnerToaster } from "sonner";

// Mounted once in main.tsx. Callers use toast.success / toast.error, never a bare toast().
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      richColors
      closeButton
      toastOptions={{ className: "font-sans" }}
    />
  );
}
