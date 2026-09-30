import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSession } from "../hooks/useSession";
import { Button } from "./ui/button";

// Icon-only on a phone, so the label goes into aria-label and a tooltip-free sr-only span.
export function SignOutButton() {
  const { t } = useTranslation();
  const { signOut } = useSession();
  return (
    <Button variant="ghost" size="icon" className="sm:w-auto sm:px-3" onClick={() => void signOut()} aria-label={t("app.signOut")}>
      <LogOut aria-hidden="true" />
      <span className="hidden sm:inline">{t("app.signOut")}</span>
    </Button>
  );
}
