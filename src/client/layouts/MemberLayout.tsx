import { Compass, Layers } from "lucide-react";
import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { type NavItem, NavBar } from "../components/NavBar";
import { PageTransition } from "../components/PageTransition";
import { Spinner } from "../components/Spinner";

const NAV_ITEMS: NavItem[] = [
  { to: "/payments", labelKey: "nav.myPlans", icon: Layers },
  { to: "/plans", labelKey: "nav.explore", icon: Compass },
];

// Members open this on a phone to pay: one narrow column, two destinations in the bottom bar.
export function MemberLayout() {
  const location = useLocation();
  return (
    <div className="min-h-dvh">
      <AppHeader width="max-w-3xl" />
      <div className="mx-auto flex w-full max-w-3xl md:gap-4 md:px-4">
        <NavBar items={NAV_ITEMS} layoutId="member-nav-indicator" />
        {/* pb-28 keeps the last row clear of the bottom bar on a phone. */}
        <main className="mx-auto w-full max-w-lg min-w-0 flex-1 px-4 pt-2 pb-28 md:px-0 md:pb-10">
          {/* Inside the layout so the header stays while a screen's chunk loads. */}
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
