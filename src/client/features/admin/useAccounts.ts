import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { Account, Role } from "../../../shared/types";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

const loadAccounts = () => api.admin.accounts();

export type AccountFieldErrors = Partial<Record<"username" | "display_name" | "role", string>>;

// A password exists in the browser only between the response that made it and closing the dialog
// that shows it (docs/auth.md): never stored, never refetched — there is no route that returns it.
export type IssuedPassword = { account: Account; password: string; reset: boolean };

export function useAccounts() {
  const { t } = useTranslation();
  const { data, error, loading, reload, setData } = useResource(loadAccounts);
  const [fieldErrors, setFieldErrors] = useState<AccountFieldErrors>({});
  const [issued, setIssued] = useState<IssuedPassword | null>(null);

  const accounts = data?.accounts ?? [];
  const replace = useCallback(
    (next: Account[]) => setData({ accounts: next }),
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
      replace([...accounts, result.data.account]);
      setIssued({ account: result.data.account, password: result.data.password, reset: false });
      return true;
    },
    [accounts, fail, replace, t],
  );

  const update = useCallback(
    async (account: Account, patch: { display_name?: string; role?: Role }) => {
      const result = await api.admin.updateAccount(account.code, patch);
      if (!result.ok) return fail(result);
      setFieldErrors({});
      replace(accounts.map((other) => (other.code === account.code ? result.data.account : other)));
      toast.success(t("accounts.savedToast", { user: result.data.account.display_name }));
      return true;
    },
    [accounts, fail, replace, t],
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
      replace(accounts.filter((other) => other.code !== account.code));
      toast.success(t("accounts.deletedToast", { user: account.display_name }));
      return true;
    },
    [accounts, replace, t],
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
