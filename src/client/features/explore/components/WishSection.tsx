import { Lightbulb, UserPlus, X } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useTranslation } from "react-i18next";
import type { MyWish } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { Button } from "../../../components/ui/button";
import { formatDate } from "../../../format";
import { spring } from "../../../lib/motion";
import { wishName } from "../../../lib/wishName";

type WishSectionProps = {
  wishes: MyWish[];
  onNew: () => void;
  onCancel: (wish: MyWish) => void;
  // Ask to join the plan opened for this wish.
  onJoin: (wish: MyWish) => void;
};

// "Can't find what you need?": ask for any service to be opened, and follow your asks — how many
// others wait with you, and the plan once it is opened.
export function WishSection({ wishes, onNew, onCancel, onJoin }: WishSectionProps) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 rounded-card border border-dashed border-outline-variant p-5">
        <p className="flex items-center gap-2 font-bold">
          <Lightbulb className="size-5 shrink-0 text-primary" aria-hidden="true" />
          {t("wishes.promptTitle")}
        </p>
        <p className="text-sm text-on-surface-variant">{t("wishes.promptBody")}</p>
        <Button variant="tonal" className="self-start" onClick={onNew}>
          {t("wishes.new")}
        </Button>
      </div>
      {wishes.length > 0 && (
        <>
          <h2 className="px-1 text-sm font-semibold tracking-wide text-on-surface-variant">{t("wishes.mine")}</h2>
          <ul className="flex flex-col gap-2">
            <AnimatePresence initial={false}>
              {wishes.map((wish) => (
                <m.li
                  key={wish.code}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: spring }}
                  className="flex flex-col gap-2 rounded-3xl bg-surface-container-low px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <ServiceLogo provider={wish.provider} name={wishName(wish)} className="size-10 rounded-xl text-sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{wishName(wish)}</p>
                      <p className="text-sm text-on-surface-variant">{statusLine(wish, t)}</p>
                    </div>
                    {wish.status === "OPEN" && (
                      <Button variant="icon" size="icon" aria-label={t("wishes.cancelLabel", { service: wishName(wish) })} onClick={() => onCancel(wish)}>
                        <X aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  {wish.status === "FULFILLED" && wish.plan && wish.plan.open && !wish.plan.joined && wish.plan.free_seats > 0 && (
                    <Button className="self-start" onClick={() => onJoin(wish)}>
                      <UserPlus aria-hidden="true" />
                      {t("wishes.join", { plan: wish.plan.name })}
                    </Button>
                  )}
                </m.li>
              ))}
            </AnimatePresence>
          </ul>
        </>
      )}
    </section>
  );
}

function statusLine(wish: MyWish, t: ReturnType<typeof useTranslation>["t"]): string {
  switch (wish.status) {
    case "OPEN":
      return wish.others_waiting > 0
        ? t("wishes.waitingWithOthers", { count: wish.others_waiting })
        : t("wishes.waitingAlone", { date: formatDate(wish.created_at) });
    case "FULFILLED":
      if (!wish.plan) return t("wishes.fulfilledGone");
      if (wish.plan.joined) return t("wishes.fulfilledJoined", { plan: wish.plan.name });
      if (!wish.plan.open || wish.plan.free_seats <= 0) return t("wishes.fulfilledFull", { plan: wish.plan.name });
      return t("wishes.fulfilled", { plan: wish.plan.name });
    case "CANCELLED":
      return t("wishes.cancelled");
    case "DECLINED":
      return t("wishes.declined");
  }
}
