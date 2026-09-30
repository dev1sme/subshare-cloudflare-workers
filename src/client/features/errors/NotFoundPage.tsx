import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { buttonVariants } from "../../components/ui/button";

// Also shown for another role's pages: telling "no such page" from "not yours" would reveal
// the admin routes (docs/architecture.md).
export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-5xl font-semibold text-muted-foreground tabular-nums">404</p>
      <h1 className="text-xl font-semibold">{t("notFound.title")}</h1>
      <p className="max-w-sm text-muted-foreground">{t("notFound.body")}</p>
      <Link to="/" className={buttonVariants()}>
        {t("notFound.home")}
      </Link>
    </main>
  );
}
