import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useSession } from "../hooks/useSession";
import { cn } from "../lib/cn";
import { BrandLogo } from "./BrandLogo";
import { SignOutButton } from "./SignOutButton";
import { UserAvatar } from "./UserAvatar";

// M3 small top app bar. `width` matches the layout's content column so the logo lines up
// with the page title.
export function AppHeader({ width }: { width: string }) {
  const { t } = useTranslation();
  const { session } = useSession();
  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md">
      <div className={cn("mx-auto flex h-16 items-center justify-between gap-3 px-4", width)}>
        <Link
          to="/"
          className="flex items-center gap-2 rounded-full text-lg font-bold tracking-tight text-primary focus-visible:outline-3 focus-visible:outline-primary"
        >
          <BrandLogo />
          {t("app.name")}
        </Link>
        <div className="flex min-w-0 items-center gap-1">
          {session.user && (
            <Link
              to={session.user.role === "ADMIN" ? "/admin/account" : "/account"}
              aria-label={t("account.title")}
              className="state-layer relative flex size-11 items-center justify-center overflow-hidden rounded-full focus-visible:outline-3 focus-visible:outline-primary"
            >
              <UserAvatar name={session.user.display_name} />
            </Link>
          )}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}
