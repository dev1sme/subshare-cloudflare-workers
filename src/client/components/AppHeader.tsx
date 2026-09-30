import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useSession } from "../hooks/useSession";
import { cn } from "../lib/cn";
import { SignOutButton } from "./SignOutButton";

// `width` matches the layout's content column so the logo lines up with the page title.
export function AppHeader({ width }: { width: string }) {
  const { t } = useTranslation();
  const { session } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
      <div className={cn("mx-auto flex h-14 items-center justify-between gap-3 px-4", width)}>
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
