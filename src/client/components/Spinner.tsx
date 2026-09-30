import { LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "../lib/cn";

export function Spinner({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div role="status" className={cn("flex items-center justify-center p-8 text-primary", className)}>
      <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
      <span className="sr-only">{t("app.loading")}</span>
    </div>
  );
}
