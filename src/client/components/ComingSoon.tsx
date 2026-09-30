import { useTranslation } from "react-i18next";

// Stand-in for a screen that is not built yet. Removed screen by screen as they land.
export function ComingSoon({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation();
  return (
    <section className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <p className="text-muted-foreground">{t("placeholder.comingSoon")}</p>
    </section>
  );
}
