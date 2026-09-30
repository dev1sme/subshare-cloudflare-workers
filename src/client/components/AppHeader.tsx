import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { useSession } from "../hooks/useSession";
import { cn } from "../lib/cn";
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
          <Logo />
          {t("app.name")}
        </Link>
        <div className="flex min-w-0 items-center gap-1">
          {session.user && <UserAvatar name={session.user.display_name} />}
          <SignOutButton />
        </div>
      </div>
    </header>
  );
}

// Two overlapping rounded squares: a shared subscription. Decorative, the name follows it.
function Logo() {
  return (
    <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
      <rect x="2" y="6" width="20" height="20" rx="7" className="fill-primary" />
      <rect x="10" y="6" width="20" height="20" rx="7" className="fill-tertiary-container mix-blend-multiply" />
    </svg>
  );
}
