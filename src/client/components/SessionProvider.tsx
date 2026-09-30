import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api, onUnauthorized } from "../api";
import { errorMessage } from "../errors";
import { type Session, SessionContext } from "../hooks/useSession";

export function SessionProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [session, setSession] = useState<Session>({ status: "loading", user: null });
  // Read by the unauthorized listener without re-subscribing on every session change.
  const statusRef = useRef(session.status);
  useEffect(() => {
    statusRef.current = session.status;
  }, [session.status]);

  useEffect(() => {
    let cancelled = false;
    void api.auth.me().then((result) => {
      if (cancelled) return;
      setSession(result.ok ? { status: "signedIn", user: result.data.user } : { status: "signedOut", user: null });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any request answering UNAUTHORIZED ends the session; the route guard then shows the login page.
  useEffect(
    () =>
      onUnauthorized(() => {
        // Only a session that was live has "expired"; a 401 while signed out is expected.
        if (statusRef.current === "signedIn") toast.error(t("errors.UNAUTHORIZED"));
        setSession({ status: "signedOut", user: null });
      }),
    [t],
  );

  const signIn = useCallback(
    async (username: string, password: string) => {
      const result = await api.auth.login(username, password);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      setSession({ status: "signedIn", user: result.data.user });
      return true;
    },
    [t],
  );

  const signOut = useCallback(async () => {
    const result = await api.auth.logout();
    if (!result.ok) {
      toast.error(errorMessage(t, result.code));
      return false;
    }
    setSession({ status: "signedOut", user: null });
    return true;
  }, [t]);

  const value = useMemo(() => ({ session, signIn, signOut }), [session, signIn, signOut]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
