import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";

type LoginFormProps = {
  // Resolves true on success; a failure has already raised its toast.
  onSubmit: (username: string, password: string) => Promise<boolean>;
};

// Paste is allowed and autocomplete is set so password managers work (WCAG 2.2 accessible
// authentication). The username field is not type="email": usernames are not emails.
export function LoginForm({ onSubmit }: LoginFormProps) {
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    const ok = await onSubmit(username, password);
    // On success this component unmounts (the route redirects); only reset on failure.
    if (!ok) {
      setSubmitting(false);
      setPassword("");
    }
  };

  return (
    // method="post": if the script has not attached yet, a native submit must never put the
    // password in the URL (history, logs), which the default GET would.
    <form method="post" onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="username">{t("login.username")}</Label>
        <Input
          id="username"
          name="username"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          autoFocus
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">{t("login.password")}</Label>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            className="pr-12"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-0 right-0 text-muted-foreground"
            onClick={() => setShowPassword((shown) => !shown)}
            aria-label={t(showPassword ? "login.hidePassword" : "login.showPassword")}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </Button>
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="mt-2 w-full">
        {submitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {t(submitting ? "login.submitting" : "login.submit")}
      </Button>
    </form>
  );
}
