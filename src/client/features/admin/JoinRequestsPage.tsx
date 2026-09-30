import { AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";
import type { JoinRequest } from "../../../shared/types";
import { EmptyState } from "../../components/EmptyState";
import { LoadError } from "../../components/LoadError";
import { Skeleton } from "../../components/Skeleton";
import { useConfirm } from "../../hooks/useConfirm";
import { formatMoney } from "../../format";
import { JoinRequestCard } from "./components/JoinRequestCard";
import { useJoinRequests } from "./useJoinRequests";

export default function JoinRequestsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { requests, error, loading, reload, decide } = useJoinRequests();

  const approve = async (request: JoinRequest) => {
    const names = { user: request.user.display_name, plan: request.plan.name, amount: formatMoney(request.plan.member_amount) };
    if (await confirm({ title: t("requests.approveTitle", names), description: t("requests.approveBody", names), confirmLabel: t("requests.approve") })) {
      await decide(request, "approve");
    }
  };

  const reject = async (request: JoinRequest) => {
    const title = t("requests.rejectTitle", { user: request.user.display_name });
    if (await confirm({ title, destructive: true, confirmLabel: t("requests.reject") })) await decide(request, "reject");
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("requests.title")}</h1>
      {loading && (
        <div className="flex flex-col gap-3" role="status" aria-busy="true">
          <Skeleton className="h-60 rounded-card" />
          <Skeleton className="h-60 rounded-card" />
        </div>
      )}
      {error && <LoadError code={error} onRetry={reload} />}
      {!loading && !error && requests.length === 0 && <EmptyState tone="success" title={t("requests.empty")} />}
      <ul className="flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {requests.map((request) => (
            <JoinRequestCard
              key={request.code}
              request={request}
              onApprove={(r) => void approve(r)}
              onReject={(r) => void reject(r)}
            />
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
