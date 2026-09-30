import { Check, X } from "lucide-react";
import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import type { JoinRequest } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { SlotMeter } from "../../../components/SlotMeter";
import { UserAvatar } from "../../../components/UserAvatar";
import { Button } from "../../../components/ui/button";
import { formatDate, formatMoney } from "../../../format";
import { spring } from "../../../lib/motion";

type JoinRequestCardProps = {
  request: JoinRequest;
  onApprove: (request: JoinRequest) => void;
  onReject: (request: JoinRequest) => void;
};

// Enters from below, leaves sideways when decided; the rest of the queue closes the gap (layout).
export function JoinRequestCard({ request, onApprove, onReject }: JoinRequestCardProps) {
  const { t } = useTranslation();
  const full = request.plan.active_members >= request.plan.max_slots;
  return (
    <m.li
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: spring }}
      exit={{ opacity: 0, x: 80, transition: { duration: 0.2, ease: [0.3, 0, 0.8, 0.15] } }}
      className="flex flex-col gap-4 rounded-card bg-surface-container-low p-5"
    >
      <div className="flex items-center gap-3">
        <UserAvatar name={request.user.display_name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-bold">{request.user.display_name}</p>
          <p className="truncate text-sm text-on-surface-variant">@{request.user.username}</p>
        </div>
        <span className="text-xs text-on-surface-variant">{t("requests.askedOn", { date: formatDate(request.created_at) })}</span>
      </div>
      <div className="flex items-center gap-3 rounded-2xl bg-surface-container px-3 py-3">
        <ServiceLogo provider={request.plan.provider} name={request.plan.name} className="size-11 rounded-xl text-sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <p className="truncate font-semibold">{request.plan.name}</p>
            <p className="shrink-0 text-sm font-semibold tabular-nums">{formatMoney(request.plan.member_amount)}</p>
          </div>
          <div className="flex items-center justify-between gap-3">
            <SlotMeter used={request.plan.active_members} total={request.plan.max_slots} />
            <span className="text-xs text-on-surface-variant">
              {t("requests.seats", { used: request.plan.active_members, total: request.plan.max_slots })}
            </span>
          </div>
        </div>
      </div>
      {request.note && (
        <blockquote className="rounded-2xl border-l-4 border-tertiary bg-tertiary-container/40 px-4 py-2 text-sm break-words">
          {request.note}
        </blockquote>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="text" onClick={() => onReject(request)}>
          <X aria-hidden="true" />
          {t("requests.reject")}
        </Button>
        <Button disabled={full} onClick={() => onApprove(request)}>
          <Check aria-hidden="true" />
          {full ? t("explore.full") : t("requests.approve")}
        </Button>
      </div>
    </m.li>
  );
}
