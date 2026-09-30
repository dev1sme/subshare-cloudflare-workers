import { useTranslation } from "react-i18next";
import { UserAvatar } from "../../components/UserAvatar";
import { useSession } from "../../hooks/useSession";
import { ChangePasswordForm } from "./components/ChangePasswordForm";
import { useChangePassword } from "./useChangePassword";

// The signed-in user's own account, for both roles: who they are, and changing their password.
export default function AccountPage() {
  const { t } = useTranslation();
  const { session } = useSession();
  const { fieldErrors, clearError, changePassword } = useChangePassword();
  const user = session.user;
  if (!user) return null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("account.title")}</h1>
      <section className="flex items-center gap-4 rounded-card bg-surface-container-low p-4">
        <UserAvatar name={user.display_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{user.display_name}</p>
          <p className="truncate text-sm text-on-surface-variant">
            {user.username} · {t(`role.${user.role}`)}
          </p>
        </div>
      </section>
      <section className="flex flex-col gap-4 rounded-card bg-surface-container-low p-5 [--field-bg:var(--color-surface-container-low)]">
        <div>
          <h2 className="text-lg font-bold">{t("account.passwordTitle")}</h2>
          <p className="text-sm text-on-surface-variant">{t("account.passwordBody")}</p>
        </div>
        <ChangePasswordForm username={user.username} errors={fieldErrors} onEdit={clearError} onSubmit={changePassword} />
      </section>
    </div>
  );
}
