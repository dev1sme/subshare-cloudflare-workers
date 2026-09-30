import { Spinner } from "./components/Spinner";
import { useSession } from "./hooks/useSession";
import { AppRoutes } from "./routes";

// Session gate: nothing route-dependent renders until /api/auth/me has answered, so a signed-in
// user never sees the login page flash on reload.
export default function App() {
  const { session } = useSession();
  if (session.status === "loading") return <Spinner className="min-h-dvh" />;
  return <AppRoutes />;
}
