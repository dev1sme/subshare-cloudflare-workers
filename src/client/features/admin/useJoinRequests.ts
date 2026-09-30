import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { JoinRequest } from "../../../shared/types";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useInFlight } from "../../hooks/useInFlight";
import { useResource } from "../../hooks/useResource";

const loadPending = () => api.admin.pendingJoinRequests();

export function useJoinRequests() {
  const { t } = useTranslation();
  const { data, error, loading, reload, setData } = useResource(loadPending);
  // Cards with a request in flight: their buttons are disabled, and a double click sends one request.
  const { busy, start, finish } = useInFlight();

  // A decided request leaves the queue locally (so it can animate out) and the list is refetched
  // on failure, since a refusal usually means someone else decided first.
  const decide = useCallback(
    async (request: JoinRequest, action: "approve" | "reject") => {
      if (!start(request.code)) return false;
      const result =
        action === "approve" ? await api.admin.approveJoinRequest(request.code) : await api.admin.rejectJoinRequest(request.code);
      finish(request.code);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        reload();
        return false;
      }
      // An approval takes a seat: the other cards of that plan show it, so a now-full plan
      // disables their Approve instead of failing after the confirm dialog.
      const seatTaken = action === "approve";
      setData((current) => ({
        join_requests: current.join_requests
          .filter((r) => r.code !== request.code)
          .map((r) =>
            seatTaken && r.plan.code === request.plan.code
              ? { ...r, plan: { ...r.plan, active_members: r.plan.active_members + 1 } }
              : r,
          ),
      }));
      toast.success(
        action === "approve"
          ? t("requests.approved", { user: request.user.display_name, plan: request.plan.name })
          : t("requests.rejected"),
      );
      return true;
    },
    [finish, reload, setData, start, t],
  );

  return { requests: data?.join_requests ?? [], error, loading: loading && !data, reload, busy, decide };
}
