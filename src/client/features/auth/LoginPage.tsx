import { useTranslation } from "react-i18next";

// Placeholder until the login screen is built (roadmap: "Màn thành viên").
export default function LoginPage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-2 p-6 text-center">
      <h1 className="text-2xl font-semibold text-primary">{t("app.name")}</h1>
      <p className="text-muted-foreground">{t("placeholder.comingSoon")}</p>
    </main>
  );
}
