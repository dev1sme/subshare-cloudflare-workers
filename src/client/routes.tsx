import { type ReactNode, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router";
import type { Role } from "../shared/types";
import LoginPage from "./features/auth/LoginPage";
import NotFoundPage from "./features/errors/NotFoundPage";
import { useSession } from "./hooks/useSession";
import { AdminLayout } from "./layouts/AdminLayout";
import { MemberLayout } from "./layouts/MemberLayout";

// Every screen behind login is its own chunk: a member paying on a phone never downloads the
// admin panel. Login, 404 and the layouts stay eager (a lazy layout is a waterfall for nothing).
const MyPaymentsPage = lazy(() => import("./features/payments/MyPaymentsPage"));
const AdminPaymentsPage = lazy(() => import("./features/admin/AdminPaymentsPage"));
const PlansPage = lazy(() => import("./features/admin/PlansPage"));
const AccountsPage = lazy(() => import("./features/admin/AccountsPage"));

const HOME: Record<Role, string> = {
  ADMIN: "/admin/payments",
  MEMBER: "/payments",
};

// Navigation convenience only — the API enforces roles. Another role's page is a plain 404.
function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (session.status === "signedOut") return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (session.user?.role !== role) return <NotFoundPage />;
  return children;
}

function HomeRedirect() {
  const { session } = useSession();
  return <Navigate to={session.user ? HOME[session.user.role] : "/login"} replace />;
}

function LoginRoute() {
  const { session } = useSession();
  return session.user ? <Navigate to={HOME[session.user.role]} replace /> : <LoginPage />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route
        element={
          <RequireRole role="MEMBER">
            <MemberLayout />
          </RequireRole>
        }
      >
        <Route path="/payments" element={<MyPaymentsPage />} />
      </Route>
      <Route
        path="/admin"
        element={
          <RequireRole role="ADMIN">
            <AdminLayout />
          </RequireRole>
        }
      >
        <Route index element={<Navigate to="payments" replace />} />
        <Route path="payments" element={<AdminPaymentsPage />} />
        <Route path="plans" element={<PlansPage />} />
        <Route path="accounts" element={<AccountsPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
