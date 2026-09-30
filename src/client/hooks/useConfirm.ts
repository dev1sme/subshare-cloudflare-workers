import { createContext, useContext } from "react";

export type ConfirmOptions = {
  title: string;
  description?: string;
  confirmLabel?: string;
  // Red confirm button, for deletes and other actions that cannot be undone.
  destructive?: boolean;
};

// Resolves true when the user confirms, false on cancel / Escape / clicking outside.
export type Confirm = (options: ConfirmOptions) => Promise<boolean>;

export const ConfirmContext = createContext<Confirm | null>(null);

// The in-app replacement for window.confirm, which cannot be styled and blocks the whole tab.
export function useConfirm(): Confirm {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>.");
  return confirm;
}
