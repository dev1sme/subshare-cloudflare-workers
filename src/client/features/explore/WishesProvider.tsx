import { type ReactNode, createContext, useContext } from "react";
import { type WishesState, useWishesState } from "./useWishesState";

const WishesContext = createContext<WishesState | null>(null);

// Mounted by the member layout, so the wishes are fetched once per visit, not once per screen.
export function WishesProvider({ children }: { children: ReactNode }) {
  const state = useWishesState();
  return <WishesContext value={state}>{children}</WishesContext>;
}

export function useWishes(): WishesState {
  const value = useContext(WishesContext);
  if (!value) throw new Error("useWishes must be used inside <WishesProvider>.");
  return value;
}
