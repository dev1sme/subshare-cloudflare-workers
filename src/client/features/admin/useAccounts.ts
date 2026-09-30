import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { Account, Role } from "../../../shared/types";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";
import { useSession } from "../../hooks/useSession";

const loadAccounts = () => api.admin.accounts();

export type AccountFieldErrors = Partial<Record<"username" | "display_name" | "role", string>>;

// A password exists in the browser only between the response that made it and closing the dialog
// that shows it (docs/auth.md): never stored, never refetched — there is no route that returns it.
export type IssuedPassword = { account: Account; password: string; reset: boolean };

export function useAccounts() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { session, replaceUser } = useSession();
  const { data, error, loading, reload, setData } = useResource(loadAccounts);
  const [fieldErrors, setFieldErrors] = useState<AccountFieldErrors>({});
  const [issued, setIssued] = useState<IssuedPassword | null>(null);

  const accounts = data?.accounts ?? [];
  // Always from the latest list: two changes in flight must not undo each other.
  const change = useCallback(
    (update: (current: Account[]) => Account[]) => setData((current) => ({ accounts: update(current.accounts) })),
    [setData],
  );

  const fail = useCallback(
    (result: { code: string; details: Record<string, string[]> | null }) => {
      const field = result.details ? Object.keys(result.details)[0] : undefined;
      setFieldErrors(field ? { [field]: errorMessage(t, result.code) } : {});
      toast.error(errorMessage(t, result.code));
      return false;
    },
    [t],
  );

  const create = useCallback(
    async (fields: { username: string; display_name: string; role: Role }) => {
      const result = await api.admin.createAccount(fields);
      // The only unique column here is the username, so a duplicate is always that field.
      if (!result.ok && result.code === "DUPLICATE_DATA") {
        setFieldErrors({ username: t("accounts.usernameTaken") });
        toast.error(t("accounts.usernameTaken"));
        return false;
      }
      if (!result.ok) return fail(result);
      setFieldErrors({});
      change((current) => [...current, result.data.account]);
      setIssued({ account: result.data.account, password: result.data.password, reset: false });
      return true;
    },
    [change, fail, t],
  );

  const update = useCallback(
    async (account: Account, patch: { display_name?: string; role?: Role }) => {
      // Nothing changed: close without a request (the server would answer NOTHING_TO_UPDATE).
      if (Object.keys(patch).length === 0) return true;
      const result = await api.admin.updateAccount(account.code, patch);
      if (!result.ok) return fail(result);
      setFieldErrors({});
      const updated = result.data.account;
      change((current) => current.map((other) => (other.code === updated.code ? updated : other)));
      toast.success(t("accounts.savedToast", { user: updated.display_name }));
      // Your own account: the header shows the new name, and a self-demotion leaves the admin area
      // at once instead of every screen failing with 403.
      if (updated.code === session.user?.code) {
        replaceUser({ code: updated.code, username: updated.username, display_name: updated.display_name, role: updated.role });
        if (updated.role !== "ADMIN") navigate("/", { replace: true });
      }
      return true;
    },
    [change, fail, navigate, replaceUser, session.user?.code, t],
  );

  const resetPassword = useCallback(
    async (account: Account) => {
      const result = await api.admin.resetPassword(account.code);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      setIssued({ account, password: result.data.password, reset: true });
      return true;
    },
    [t],
  );

  const remove = useCallback(
    async (account: Account) => {
      const result = await api.admin.deleteAccount(account.code);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        return false;
      }
      change((current) => current.filter((other) => other.code !== account.code));
      toast.success(t("accounts.deletedToast", { user: account.display_name }));
      return true;
    },
    [change, t],
  );

  return {
    accounts,
    error,
    loading: loading && !data,
    reload,
    fieldErrors,
    clearFieldErrors: useCallback(() => setFieldErrors({}), []),
    issued,
    // Closing the password dialog drops the only copy.
    dismissIssued: useCallback(() => setIssued(null), []),
    create,
    update,
    resetPassword,
    remove,
  };
}
