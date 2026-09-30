import { createContext, useContext } from "react";
import type { User } from "../../shared/types";

export type Session =
  | { status: "loading"; user: null }
  | { status: "signedOut"; user: null }
  | { status: "signedIn"; user: User };

export type SessionContextValue = {
  session: Session;
  // Resolve true on success; failures raise their own toast.
  signIn: (username: string, password: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>.");
  return value;
}
