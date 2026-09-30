import { CreditCard, Layers, type LucideIcon, Users } from "lucide-react";
import { Suspense } from "react";
import { useTranslation } from "react-i18next";
import { NavLink, Outlet } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { Spinner } from "../components/Spinner";
import { cn } from "../lib/cn";

type NavItem = { to: string; labelKey: string; icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/payments", labelKey: "nav.payments", icon: CreditCard },
  { to: "/admin/plans", labelKey: "nav.plans", icon: Layers },
  { to: "/admin/accounts", labelKey: "nav.accounts", icon: Users },
];

// Bottom tab bar on a phone (thumb reach, ≤5 items), sidebar from md up.
export function AdminLayout() {
  const { t } = useTranslation();
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <div className="mx-auto flex w-full max-w-5xl md:gap-6 md:px-4">
        <nav
          aria-label={t("app.mainNav")}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] md:static md:w-52 md:shrink-0 md:border-0 md:bg-transparent md:py-6 md:pb-0"
        >
          <ul className="grid grid-cols-3 md:flex md:flex-col md:gap-1">
            {NAV_ITEMS.map(({ to, labelKey, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 text-xs font-medium transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:min-h-11 md:flex-row md:justify-start md:gap-3 md:rounded-lg md:px-3 md:text-sm",
                      isActive ? "text-primary md:bg-paid-soft" : "text-muted-foreground hover:text-foreground md:hover:bg-muted",
                    )
                  }
                >
                  <Icon className="size-5 md:size-4" aria-hidden="true" />
                  {t(labelKey)}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        {/* pb-24 keeps the last row clear of the fixed bottom bar on a phone. */}
        <main className="min-w-0 flex-1 px-4 pt-6 pb-24 md:px-0 md:pb-6">
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
