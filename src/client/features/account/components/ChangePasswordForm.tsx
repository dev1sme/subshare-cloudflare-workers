import { Eye, EyeOff, KeyRound, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { TextField } from "../../../components/ui/text-field";
import type { PasswordField, PasswordFieldErrors } from "../useChangePassword";

type ChangePasswordFormProps = {
  username: string;
  errors: PasswordFieldErrors;
  onEdit: (field: PasswordField) => void;
  // Resolves true on success; a failure has already raised its toast.
  onSubmit: (current: string, next: string, confirmation: string) => Promise<boolean>;
};

// One show/hide toggle for all three fields. autocomplete tells a password manager which field is
// the old one and which it should offer to generate and save.
export function ChangePasswordForm({ username, errors, onEdit, onSubmit }: ChangePasswordFormProps) {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<PasswordField, string>>({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [shown, setShown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const edit = (field: PasswordField, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    onEdit(field);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const changed = await onSubmit(values.current_password, values.new_password, values.confirm_password);
    setSubmitting(false);
    // Passwords never linger in state after they served their purpose.
    if (changed) setValues({ current_password: "", new_password: "", confirm_password: "" });
  };

  const type = shown ? "text" : "password";
  return (
    // method="post": a native submit before the script attaches must never put passwords in the URL.
    <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      {/* Lets a password manager tie the new password to this account. */}
      <input type="text" name="username" autoComplete="username" value={username} readOnly hidden />
      <TextField
        label={t("account.currentPassword")}
        name="current_password"
        type={type}
        autoComplete="current-password"
        required
        value={values.current_password}
        error={errors.current_password}
        onChange={(event) => edit("current_password", event.target.value)}
        trailing={
          <Button
            variant="icon"
            size="icon"
            onClick={() => setShown((current) => !current)}
            aria-label={t(shown ? "login.hidePassword" : "login.showPassword")}
            aria-pressed={shown}
          >
            {shown ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        }
      />
      <TextField
        label={t("account.newPassword")}
        name="new_password"
        type={type}
        autoComplete="new-password"
        required
        minLength={8}
        value={values.new_password}
        error={errors.new_password}
        onChange={(event) => edit("new_password", event.target.value)}
      />
      {!errors.new_password && <p className="-mt-2 px-4 text-xs text-on-surface-variant">{t("account.newPasswordHint")}</p>}
      <TextField
        label={t("account.confirmPassword")}
        name="confirm_password"
        type={type}
        autoComplete="new-password"
        required
        value={values.confirm_password}
        error={errors.confirm_password}
        onChange={(event) => edit("confirm_password", event.target.value)}
      />
      <Button type="submit" disabled={submitting} className="mt-1 self-end">
        {submitting ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <KeyRound aria-hidden="true" />}
        {t("account.submit")}
      </Button>
    </form>
  );
}
