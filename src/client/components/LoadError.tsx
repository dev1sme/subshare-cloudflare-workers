import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { errorMessage } from "../errors";
import { Button } from "./ui/button";

// Inline failure state for a screen whose data did not load, with a way to try again.
export function LoadError({ code, onRetry }: { code: string; onRetry: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="font-medium">{t("payments.loadFailed")}</p>
      <p className="text-sm text-muted-foreground">{errorMessage(t, code)}</p>
      {/* Retrying cannot make a missing resource appear. */}
      {code !== "NOT_FOUND" && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          {t("payments.retry")}
        </Button>
      )}
    </div>
  );
}
