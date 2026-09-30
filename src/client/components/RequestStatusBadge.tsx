import { useTranslation } from "react-i18next";
import type { JoinRequestStatus } from "../../shared/types";
import { cn } from "../lib/cn";

const TONE: Record<JoinRequestStatus, string> = {
  PENDING: "bg-warning-container text-on-warning-container",
  APPROVED: "bg-success-container text-on-success-container",
  REJECTED: "bg-error-container text-on-error-container",
  CANCELLED: "bg-surface-container-highest text-on-surface-variant",
};

export function RequestStatusBadge({ status }: { status: JoinRequestStatus }) {
  const { t } = useTranslation();
  return (
    <span className={cn("inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap", TONE[status])}>
      {t(`requestStatus.${status}`)}
    </span>
  );
}
