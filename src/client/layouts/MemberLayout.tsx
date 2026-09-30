import { Suspense } from "react";
import { Outlet, useLocation } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { PageTransition } from "../components/PageTransition";
import { Spinner } from "../components/Spinner";

// Members open this on a phone to pay: one narrow column.
export function MemberLayout() {
  const location = useLocation();
  return (
    <div className="min-h-dvh">
      <AppHeader width="max-w-lg" />
      <main className="mx-auto w-full max-w-lg px-4 pt-2 pb-10">
        {/* Inside the layout so the header stays while a screen's chunk loads. */}
        <Suspense fallback={<Spinner />}>
          <PageTransition key={location.pathname}>
            <Outlet />
          </PageTransition>
        </Suspense>
      </main>
    </div>
  );
}
