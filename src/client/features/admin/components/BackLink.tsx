import { ChevronLeft } from "lucide-react";
import { Link } from "react-router";

// "‹ Parent" at the top of a sub-screen.
export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="state-layer relative -ml-3 inline-flex min-h-11 w-fit items-center gap-1 overflow-hidden rounded-full px-3 text-sm font-semibold text-primary focus-visible:outline-3 focus-visible:outline-primary"
    >
      <ChevronLeft className="size-5" aria-hidden="true" />
      {label}
    </Link>
  );
}
