import { AnimatePresence } from "motion/react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { JoinRequest, Wish } from "../../../shared/types";
import { EmptyState } from "../../components/EmptyState";
import { LoadError } from "../../components/LoadError";
import { SegmentedTabs } from "../../components/SegmentedTabs";
import { Skeleton } from "../../components/Skeleton";
import { useConfirm } from "../../hooks/useConfirm";
import { formatMoney } from "../../format";
import { JoinRequestCard } from "./components/JoinRequestCard";
import { WishGroupCard } from "./components/WishGroupCard";
import { useJoinRequests } from "./useJoinRequests";
import { useWishesAdmin } from "./useWishesAdmin";

type Section = "requests" | "wishes";

export default function JoinRequestsPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { requests, error, loading, reload, busy, decide } = useJoinRequests();
  const wishes = useWishesAdmin();
  // Screen state: join requests for existing plans, or asks for new plans.
  const [section, setSection] = useState<Section>("requests");

  const declineWish = async (wish: Wish) => {
    const confirmed = await confirm({
      title: t("wishesAdmin.declineTitle", { user: wish.user.display_name }),
      description: t("wishesAdmin.declineBody"),
      destructive: true,
      confirmLabel: t("wishesAdmin.decline"),
    });
    if (confirmed) await wishes.decline(wish);
  };

  const approve = async (request: JoinRequest) => {
    const names = { user: request.user.display_name, plan: request.plan.name, amount: formatMoney(request.plan.member_amount) };
    if (await confirm({ title: t("requests.approveTitle", names), description: t("requests.approveBody", names), confirmLabel: t("requests.approve") })) {
      await decide(request, "approve");
    }
  };

  const reject = async (request: JoinRequest) => {
    const title = t("requests.rejectTitle", { user: request.user.display_name, plan: request.plan.name });
    if (await confirm({ title, destructive: true, confirmLabel: t("requests.reject") })) await decide(request, "reject");
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-bold tracking-tight">{t("requests.title")}</h1>
      <SegmentedTabs
        label={t("wishesAdmin.sections")}
        layoutId="requests-section"
        value={section}
        onChange={setSection}
        segments={[
          { value: "requests", label: requests.length > 0 ? `${t("wishesAdmin.joinTab")} (${requests.length})` : t("wishesAdmin.joinTab") },
          { value: "wishes", label: wishes.total > 0 ? `${t("wishesAdmin.wishTab")} (${wishes.total})` : t("wishesAdmin.wishTab") },
        ]}
      />
      {section === "wishes" ? (
        <>
          <p className="text-sm text-on-surface-variant">{t("wishesAdmin.hint")}</p>
          {wishes.loading && <Skeleton className="h-48 rounded-card" />}
          {wishes.error && <LoadError code={wishes.error} onRetry={wishes.reload} />}
          <div className="flex flex-col gap-4">
            <AnimatePresence initial={false}>
              {wishes.groups.map((group) => (
                <WishGroupCard key={group.key} group={group} busy={wishes.busy} onDecline={(w) => void declineWish(w)} />
              ))}
            </AnimatePresence>
          </div>
          {!wishes.loading && !wishes.error && wishes.groups.length === 0 && (
            <EmptyState tone="success" icon="done" title={t("wishesAdmin.empty")} />
          )}
        </>
      ) : (
        <>
          {loading && (
            <div className="flex flex-col gap-3" role="status" aria-busy="true">
              <Skeleton className="h-60 rounded-card" />
              <Skeleton className="h-60 rounded-card" />
            </div>
          )}
          {error && <LoadError code={error} onRetry={reload} />}
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {requests.map((request) => (
                <JoinRequestCard
                  key={request.code}
                  request={request}
                  busy={busy.has(request.code)}
                  onApprove={(r) => void approve(r)}
                  onReject={(r) => void reject(r)}
                />
              ))}
            </AnimatePresence>
          </ul>
          {/* After the list, so the last card slides out above it instead of under it. */}
          {!loading && !error && requests.length === 0 && <EmptyState tone="success" icon="done" title={t("requests.empty")} />}
        </>
      )}
    </div>
  );
}
