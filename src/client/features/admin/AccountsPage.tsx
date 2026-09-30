import { KeyRound, Pencil, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { Account } from "../../../shared/types";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { UserAvatar } from "../../components/UserAvatar";
import { Button } from "../../components/ui/button";
import { useConfirm } from "../../hooks/useConfirm";
import { useSession } from "../../hooks/useSession";
import { cn } from "../../lib/cn";
import { spring } from "../../lib/motion";
import { AccountFormDialog, PasswordDialog } from "./components/AccountDialogs";
import { useAccounts } from "./useAccounts";

export default function AccountsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { session } = useSession();
  const accounts = useAccounts();
  // Screen state: the account being created ("new") or edited.
  const [editing, setEditing] = useState<Account | "new" | null>(null);

  const openForm = (target: Account | "new") => {
    accounts.clearFieldErrors();
    setEditing(target);
  };

  const reset = async (account: Account) => {
    const confirmed = await confirm({
      title: t("accounts.resetTitle", { user: account.display_name }),
      description: t("accounts.resetBody"),
      confirmLabel: t("accounts.reset"),
    });
    if (confirmed) await accounts.resetPassword(account);
  };

  const remove = async (account: Account) => {
    const confirmed = await confirm({
      title: t("accounts.deleteTitle", { user: account.display_name }),
      description: t("accounts.deleteBody"),
      destructive: true,
      confirmLabel: t("accounts.delete"),
    });
    if (confirmed) await accounts.remove(account);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{t("nav.accounts")}</h1>
        <Button onClick={() => openForm("new")}>
          <Plus aria-hidden="true" />
          {t("accounts.newTitle")}
        </Button>
      </div>
      {accounts.loading && (
        <div className="flex flex-col gap-2" role="status" aria-busy="true">
          {[0, 1, 2, 3].map((row) => (
            <Skeleton key={row} className="h-16 rounded-3xl" />
          ))}
        </div>
      )}
      {accounts.error && <LoadError code={accounts.error} onRetry={accounts.reload} />}
      <ul className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {accounts.accounts.map((account) => {
            const self = account.code === session.user?.code;
            return (
              <m.li
                key={account.code}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: spring }}
                exit={{ opacity: 0, x: 80, transition: { duration: 0.2, ease: [0.3, 0, 0.8, 0.15] } }}
                className="flex items-center gap-3 rounded-3xl bg-surface-container-low py-2 pr-2 pl-4"
              >
                <UserAvatar name={account.display_name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">
                    {account.display_name}
                    {self && <span className="ml-1 text-sm font-normal text-on-surface-variant">({t("accounts.you")})</span>}
                  </p>
                  <p className="flex items-center gap-2 truncate text-sm text-on-surface-variant">
                    @{account.username}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-semibold",
                        account.role === "ADMIN" ? "bg-primary-container text-on-primary-container" : "bg-surface-container-highest",
                      )}
                    >
                      {t(`role.${account.role}`)}
                    </span>
                  </p>
                </div>
                <Button variant="icon" size="icon" aria-label={t("accounts.editLabel", { user: account.display_name })} onClick={() => openForm(account)}>
                  <Pencil aria-hidden="true" />
                </Button>
                <Button variant="icon" size="icon" aria-label={t("accounts.resetLabel", { user: account.display_name })} onClick={() => void reset(account)}>
                  <KeyRound aria-hidden="true" />
                </Button>
                {/* Deleting yourself is refused by the server; not offering it is clearer. */}
                {!self && (
                  <Button variant="icon" size="icon" aria-label={t("accounts.deleteLabel", { user: account.display_name })} onClick={() => void remove(account)}>
                    <Trash2 aria-hidden="true" />
                  </Button>
                )}
              </m.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <AccountFormDialog
        target={editing}
        errors={accounts.fieldErrors}
        onClose={() => setEditing(null)}
        onCreate={accounts.create}
        onUpdate={accounts.update}
      />
      <PasswordDialog issued={accounts.issued} onClose={accounts.dismissIssued} />
    </div>
  );
}
