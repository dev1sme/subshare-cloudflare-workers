import { CreditCard, Layers, UserPlus, Users } from "lucide-react";
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { type NavItem, NavBar } from "../components/NavBar";
import { PageTransition } from "../components/PageTransition";
import { Spinner } from "../components/Spinner";

const NAV_ITEMS: NavItem[] = [
  { to: "/admin/payments", labelKey: "nav.payments", icon: CreditCard },
  { to: "/admin/requests", labelKey: "nav.requests", icon: UserPlus },
  { to: "/admin/plans", labelKey: "nav.plans", icon: Layers },
  { to: "/admin/accounts", labelKey: "nav.accounts", icon: Users },
];

export function AdminLayout() {
  const location = useLocation();
  return (
    <div className="min-h-dvh">
      <AppHeader width="max-w-5xl" />
      <div className="mx-auto flex w-full max-w-5xl md:gap-4 md:px-4">
        <NavBar items={NAV_ITEMS} layoutId="admin-nav-indicator" />
        {/* pb-28 keeps the last row clear of the bottom bar on a phone. */}
        <main className="min-w-0 flex-1 px-4 pt-2 pb-28 md:px-0 md:pb-10">
          <Suspense fallback={<Spinner />}>
            <PageTransition key={location.pathname}>
              <Outlet />
            </PageTransition>
          </Suspense>
        </main>
      </div>
    </div>
  );
}
