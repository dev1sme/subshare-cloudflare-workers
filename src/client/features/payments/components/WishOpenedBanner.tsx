import { PartyPopper, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { MyWish } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { Button, buttonVariants } from "../../../components/ui/button";
import { formatDateTime } from "../../../format";
import { spring } from "../../../lib/motion";

// "The plan you asked for is open": the in-app notice (there is no email or push). One card per
// opened plan, until the member asks to join or dismisses it.
export function WishOpenedBanner({ notices, onDismiss }: { notices: MyWish[]; onDismiss: (code: string) => void }) {
  const { t } = useTranslation();
  return (
    <AnimatePresence initial={false}>
      {notices.map((wish) => (
        <m.section
          key={wish.code}
          layout
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0, transition: spring }}
          exit={{ opacity: 0, transition: { duration: 0.15 } }}
          role="status"
          className="flex flex-col gap-3 rounded-card bg-tertiary-container p-4 text-on-tertiary-container"
        >
          <div className="flex items-start gap-3">
            {wish.plan && <ServiceLogo provider={wish.plan.provider} name={wish.plan.name} className="size-11 rounded-xl text-sm" />}
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 font-bold">
                <PartyPopper className="size-4 shrink-0" aria-hidden="true" />
                {t("wishes.openedTitle", { plan: wish.plan?.name ?? "" })}
              </p>
              <p className="text-sm">
                {wish.plan?.priority_until && new Date(wish.plan.priority_until) > new Date()
                  ? t("wishes.openedBodyPriority", { seats: wish.plan.free_seats, until: formatDateTime(wish.plan.priority_until) })
                  : t("wishes.openedBody", { seats: wish.plan?.free_seats ?? 0 })}
              </p>
            </div>
            <Button variant="icon" size="icon" className="-mt-1 -mr-1 text-on-tertiary-container" aria-label={t("wishes.dismiss")} onClick={() => onDismiss(wish.code)}>
              <X aria-hidden="true" />
            </Button>
          </div>
          <Link to="/plans" className={buttonVariants({ className: "self-start" })}>
            {t("wishes.goJoin")}
          </Link>
        </m.section>
      ))}
    </AnimatePresence>
  );
}
