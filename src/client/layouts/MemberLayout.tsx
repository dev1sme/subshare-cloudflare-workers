import { Suspense } from "react";
import { Outlet } from "react-router";
import { AppHeader } from "../components/AppHeader";
import { Spinner } from "../components/Spinner";

// Members open this on a phone to pay: one narrow column, no navigation to learn.
export function MemberLayout() {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-6">
        {/* Inside the layout so the header stays while a screen's chunk loads. */}
        <Suspense fallback={<Spinner />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
