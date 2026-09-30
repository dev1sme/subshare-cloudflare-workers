import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../components/ui/card";
import { useSession } from "../../hooks/useSession";
import { LoginForm } from "./components/LoginForm";

// Eager (not lazy): it is the first screen most visits see.
export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useSession();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <header className="flex flex-col gap-1 text-center">
          <p className="text-2xl font-semibold text-primary">{t("app.name")}</p>
          <p className="text-sm text-muted-foreground">{t("login.subtitle")}</p>
        </header>
        <Card>
          <CardContent className="flex flex-col gap-5">
            <h1 className="text-xl font-semibold">{t("login.title")}</h1>
            <LoginForm onSubmit={signIn} />
          </CardContent>
        </Card>
        <p className="text-center text-sm text-muted-foreground">{t("login.forgot")}</p>
      </div>
    </main>
  );
}
