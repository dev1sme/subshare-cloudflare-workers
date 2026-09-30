import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { JoinRequest } from "../../../shared/types";
import { api } from "../../api";
import { errorMessage } from "../../errors";
import { useResource } from "../../hooks/useResource";

const loadPending = () => api.admin.pendingJoinRequests();

export function useJoinRequests() {
  const { t } = useTranslation();
  const { data, error, loading, reload, setData } = useResource(loadPending);

  // A decided request leaves the queue locally (so it can animate out) and the list is refetched
  // on failure, since a refusal usually means someone else decided first.
  const decide = useCallback(
    async (request: JoinRequest, action: "approve" | "reject") => {
      const result =
        action === "approve" ? await api.admin.approveJoinRequest(request.code) : await api.admin.rejectJoinRequest(request.code);
      if (!result.ok) {
        toast.error(errorMessage(t, result.code));
        reload();
        return false;
      }
      setData({ join_requests: (data?.join_requests ?? []).filter((r) => r.code !== request.code) });
      toast.success(
        action === "approve"
          ? t("requests.approved", { user: request.user.display_name, plan: request.plan.name })
          : t("requests.rejected"),
      );
      return true;
    },
    [data, reload, setData, t],
  );

  return { requests: data?.join_requests ?? [], error, loading: loading && !data, reload, decide };
}
