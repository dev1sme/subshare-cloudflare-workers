import { PackagePlus, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import type { Wish } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { UserAvatar } from "../../../components/UserAvatar";
import { Button, buttonVariants } from "../../../components/ui/button";
import { formatDate } from "../../../format";
import { spring } from "../../../lib/motion";
import { wishName } from "../../../lib/wishName";
import type { WishGroup } from "../useWishesAdmin";

type WishGroupCardProps = {
  group: WishGroup;
  busy: ReadonlySet<string>;
  onDecline: (wish: Wish) => void;
};

// One service everyone asked for: how many, who, their notes — and "Mở gói", which opens the new
// plan form for this service with these wishes attached.
export function WishGroupCard({ group, busy, onDecline }: WishGroupCardProps) {
  const { t } = useTranslation();
  const name = wishName({ provider: group.provider, service_name: group.serviceName });
  const params = new URLSearchParams({ provider: group.provider, wishes: group.wishes.map((wish) => wish.code).join(",") });
  if (group.serviceName) params.set("name", group.serviceName);
  return (
    <m.section
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: spring }}
      exit={{ opacity: 0, transition: { duration: 0.15 } }}
      className="overflow-hidden rounded-card bg-surface-container-low"
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-outline-variant/50 px-4 py-3">
        <ServiceLogo provider={group.provider} name={name} className="size-11 rounded-xl text-sm" />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-bold">{name}</h2>
          <p className="text-sm text-on-surface-variant">{t("wishesAdmin.count", { count: group.wishes.length })}</p>
        </div>
        <Link to={`/admin/plans/new?${params.toString()}`} className={buttonVariants()}>
          <PackagePlus aria-hidden="true" />
          {t("wishesAdmin.open")}
        </Link>
      </header>
      <ul className="divide-y divide-outline-variant/50">
        <AnimatePresence initial={false}>
          {group.wishes.map((wish) => (
            <m.li
              key={wish.code}
              layout
              exit={{ opacity: 0, x: 80, transition: { duration: 0.2, ease: [0.3, 0, 0.8, 0.15] } }}
              className="flex items-start gap-3 px-4 py-3"
            >
              <UserAvatar name={wish.user.display_name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{wish.user.display_name}</p>
                <p className="text-xs text-on-surface-variant">
                  @{wish.user.username} · {t("requests.askedOn", { date: formatDate(wish.created_at) })}
                </p>
                {wish.note && <p className="mt-1 text-sm break-words">{wish.note}</p>}
              </div>
              <Button
                variant="icon"
                size="icon"
                disabled={busy.has(wish.code)}
                aria-label={t("wishesAdmin.declineLabel", { user: wish.user.display_name, service: name })}
                onClick={() => onDecline(wish)}
              >
                <X aria-hidden="true" />
              </Button>
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
    </m.section>
  );
}
