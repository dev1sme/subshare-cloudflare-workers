import { useTranslation } from "react-i18next";
import type { JoinRequest } from "../../../../shared/types";
import { ServiceLogo } from "../../../components/ServiceLogo";
import { RequestStatusBadge } from "../../../components/RequestStatusBadge";
import { formatDate } from "../../../format";

export function RequestHistory({ requests }: { requests: JoinRequest[] }) {
  const { t } = useTranslation();
  if (requests.length === 0) return null;
  return (
    <section className="flex flex-col gap-3">
      <h2 className="px-1 text-sm font-semibold tracking-wide text-on-surface-variant">{t("explore.history")}</h2>
      <ul className="flex flex-col gap-2">
        {requests.map((request) => (
          <li key={request.code} className="flex items-center gap-3 rounded-3xl bg-surface-container-low px-4 py-3">
            <ServiceLogo provider={request.plan.provider} name={request.plan.name} className="size-10 rounded-xl text-sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{request.plan.name}</p>
              <p className="text-sm text-on-surface-variant">{t("requests.askedOn", { date: formatDate(request.created_at) })}</p>
            </div>
            <RequestStatusBadge status={request.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
