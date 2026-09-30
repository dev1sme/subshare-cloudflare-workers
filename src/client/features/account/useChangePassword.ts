import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { api } from "../../api";
import { errorMessage } from "../../errors";

export type PasswordField = "current_password" | "new_password" | "confirm_password";
export type PasswordFieldErrors = Partial<Record<PasswordField, string>>;

// Which field a refusal belongs under (docs/api.md, POST /api/auth/change-password).
const FIELD_OF: Record<string, PasswordField> = {
  WRONG_CURRENT_PASSWORD: "current_password",
  MISSING_CURRENT_PASSWORD: "current_password",
  TOO_LONG_CURRENT_PASSWORD: "current_password",
  PASSWORD_TOO_SHORT: "new_password",
  MISSING_NEW_PASSWORD: "new_password",
  TOO_LONG_NEW_PASSWORD: "new_password",
};

// Self-service change needs the current password (docs/auth.md). Nothing here is kept after the
// request: the form clears its fields itself once this resolves true.
export function useChangePassword() {
  const { t } = useTranslation();
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});

  const clearError = useCallback((field: PasswordField) => {
    setFieldErrors((current) => (current[field] ? { ...current, [field]: undefined } : current));
  }, []);

  const changePassword = useCallback(
    async (current: string, next: string, confirmation: string) => {
      // Caught here, not by the server: it only ever sees one copy of the new password.
      if (next !== confirmation) {
        setFieldErrors({ confirm_password: t("account.mismatch") });
        return false;
      }
      const result = await api.auth.changePassword(current, next);
      if (!result.ok) {
        const message = errorMessage(t, result.code);
        const field = FIELD_OF[result.code];
        setFieldErrors(field ? { [field]: message } : {});
        toast.error(message);
        return false;
      }
      setFieldErrors({});
      toast.success(t("account.changedToast"));
      return true;
    },
    [t],
  );

  return { fieldErrors, clearError, changePassword };
}
