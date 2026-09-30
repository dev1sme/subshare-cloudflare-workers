import { LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSession } from "../hooks/useSession";
import { Button } from "./ui/button";

export function SignOutButton() {
  const { t } = useTranslation();
  const { signOut } = useSession();
  return (
    <Button variant="icon" size="icon" onClick={() => void signOut()} aria-label={t("app.signOut")}>
      <LogOut aria-hidden="true" />
    </Button>
  );
}
