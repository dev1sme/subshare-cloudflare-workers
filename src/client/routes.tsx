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
const PaymentDetailPage = lazy(() => import("./features/payments/PaymentDetailPage"));
const PrepaymentDetailPage = lazy(() => import("./features/payments/PrepaymentDetailPage"));
const ExplorePlansPage = lazy(() => import("./features/explore/ExplorePlansPage"));
const JoinRequestsPage = lazy(() => import("./features/admin/JoinRequestsPage"));
const AdminPaymentsPage = lazy(() => import("./features/admin/AdminPaymentsPage"));
const PlansPage = lazy(() => import("./features/admin/PlansPage"));
const PlanNewPage = lazy(() => import("./features/admin/PlanNewPage"));
const PlanDetailPage = lazy(() => import("./features/admin/PlanDetailPage"));
const AccountsPage = lazy(() => import("./features/admin/AccountsPage"));
// Both roles: each layout mounts it under its own path.
const AccountPage = lazy(() => import("./features/account/AccountPage"));

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

const isAdminPath = (path: string) => path === "/admin" || path.startsWith("/admin/");

// Whether `from` is a page this role can open. After signing out, `from` is the page the previous
// user was on; the next user may have another role, and following it would land them on a 404.
function fitsRole(from: string, role: Role) {
  return role === "ADMIN" ? isAdminPath(from) : !isAdminPath(from);
}

// After signing in, go back to the page that sent the user here — but only an internal path,
// so a crafted `state.from` can never redirect off-site, and only one the new user's role can open.
function LoginRoute() {
  const { session } = useSession();
  const location = useLocation();
  if (!session.user) return <LoginPage />;
  const from = (location.state as { from?: unknown } | null)?.from;
  const internal = typeof from === "string" && from.startsWith("/") && !from.startsWith("//");
  const target = internal && fitsRole(from, session.user.role) ? from : HOME[session.user.role];
  return <Navigate to={target} replace />;
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
        <Route path="/payments/:code" element={<PaymentDetailPage />} />
        <Route path="/prepayments/:code" element={<PrepaymentDetailPage />} />
        <Route path="/plans" element={<ExplorePlansPage />} />
        <Route path="/account" element={<AccountPage />} />
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
        <Route path="requests" element={<JoinRequestsPage />} />
        <Route path="plans" element={<PlansPage />} />
        {/* Static segment before the parameter. */}
        <Route path="plans/new" element={<PlanNewPage />} />
        <Route path="plans/:code" element={<PlanDetailPage />} />
        <Route path="accounts" element={<AccountsPage />} />
        <Route path="account" element={<AccountPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
