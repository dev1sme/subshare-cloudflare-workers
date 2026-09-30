import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useSession } from "../hooks/useSession";
import { SignOutButton } from "./SignOutButton";

export function AppHeader() {
  const { t } = useTranslation();
  const { session } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link to="/" className="rounded-md text-lg font-semibold text-primary focus-visible:outline-2 focus-visible:outline-ring">
          {t("app.name")}
        </Link>
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm text-muted-foreground">{session.user?.display_name}</span>
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
