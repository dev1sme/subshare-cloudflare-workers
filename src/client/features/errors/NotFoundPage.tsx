import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { EmptyState } from "../../components/EmptyState";
import { buttonVariants } from "../../components/ui/button";

// Also shown for another role's pages: telling "no such page" from "not yours" would reveal
// the admin routes (docs/architecture.md).
export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center p-6">
      <p className="text-6xl font-bold tracking-tight text-primary tabular-nums">404</p>
      <EmptyState icon="missing" title={t("notFound.title")} body={t("notFound.body")}>
        <Link to="/" className={buttonVariants({ className: "mt-2" })}>
          {t("notFound.home")}
        </Link>
      </EmptyState>
    </main>
  );
}
