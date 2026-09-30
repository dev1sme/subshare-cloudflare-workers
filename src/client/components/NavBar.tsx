import type { LucideIcon } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { cn } from "../lib/cn";
import { spring } from "../lib/motion";

// `dot`: something new waits there (e.g. a plan you asked for was opened).
export type NavItem = { to: string; labelKey: string; icon: LucideIcon; dot?: boolean };

// M3 navigation bar on a phone (bottom, ≤5 items, thumb reach) and navigation rail from md up.
// The active indicator is one shared element (layoutId) that slides to the selected item.
export function NavBar({ items, layoutId }: { items: NavItem[]; layoutId: string }) {
  const { t } = useTranslation();
  return (
    <nav
      aria-label={t("app.mainNav")}
      className="fixed inset-x-0 bottom-0 z-40 bg-surface-container pb-[env(safe-area-inset-bottom)] md:sticky md:top-16 md:h-[calc(100dvh-4rem)] md:w-24 md:shrink-0 md:bg-transparent md:pt-4"
    >
      <ul className="flex md:flex-col md:gap-3">
        {items.map(({ to, labelKey, icon: Icon, dot }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              className="group flex min-h-20 cursor-pointer flex-col items-center justify-center gap-1 text-xs font-semibold text-on-surface-variant focus-visible:outline-none md:min-h-16"
            >
              {({ isActive }) => (
                <>
                  <span className="relative flex h-8 w-16 items-center justify-center rounded-full group-focus-visible:outline-3 group-focus-visible:outline-primary">
                    {isActive && (
                      <m.span layoutId={layoutId} transition={spring} className="absolute inset-0 rounded-full bg-secondary-container" />
                    )}
                    <span className="state-layer absolute inset-0 overflow-hidden rounded-full" />
                    <Icon
                      className={cn("relative size-6 transition-colors duration-200", isActive && "text-on-secondary-container")}
                      aria-hidden="true"
                    />
                    {dot && <span className="absolute top-0.5 right-3 size-2.5 rounded-full bg-error ring-2 ring-surface-container" aria-hidden="true" />}
                  </span>
                  <span className={cn("text-center transition-colors duration-200", isActive && "text-on-surface")}>
                    {t(labelKey)}
                    {dot && <span className="sr-only">{t("app.newItem")}</span>}
                  </span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
