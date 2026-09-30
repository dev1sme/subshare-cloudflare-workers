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

  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setSession({ status: "loading", user: null });
    void api.auth.me().then((result) => {
      if (cancelled) return;
      if (result.ok) setSession({ status: "signedIn", user: result.data.user });
      // Only the server saying "no session" signs out. A dropped connection or a 500 on a phone
      // with a flaky network must not send a signed-in member back to the password form.
      else if (result.code === "UNAUTHORIZED") setSession({ status: "signedOut", user: null });
      else setSession({ status: "unreachable", user: null, code: result.code });
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

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
      // A "wrong password" toast from an earlier attempt must not linger over the first screen.
      toast.dismiss();
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

  const value = useMemo(() => ({ session, signIn, signOut, retry }), [session, signIn, signOut, retry]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
