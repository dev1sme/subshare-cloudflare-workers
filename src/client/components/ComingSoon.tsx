import { useTranslation } from "react-i18next";
import { EmptyState } from "./EmptyState";

// Stand-in for a screen that is not built yet. Removed screen by screen as they land.
export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold tracking-tight">{t(titleKey)}</h1>
      <EmptyState icon="soon" title={t("placeholder.comingSoon")} />
    </section>
  );
}
