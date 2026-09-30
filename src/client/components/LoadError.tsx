import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "../errors";
import { EmptyState } from "./EmptyState";
import { Button } from "./ui/button";

// Inline failure state for a screen whose data did not load, with a way to try again.
export function LoadError({ code, onRetry }: { code: string; onRetry: () => void }) {
  const { t } = useTranslation();
  // A malformed code in the URL is as missing as an unknown one: retrying cannot make either appear.
  const missing = code === "NOT_FOUND" || code === "INVALID_CODE";
  return (
    <div role="alert">
      <EmptyState tone="error" title={t(missing ? "payments.missing" : "payments.loadFailed")} body={errorMessage(t, code)}>
        {!missing && (
          <Button variant="tonal" onClick={onRetry}>
            <RefreshCw aria-hidden="true" />
            {t("payments.retry")}
          </Button>
        )}
      </EmptyState>
    </div>
  );
}
