import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import { useSession } from "../../hooks/useSession";
import { listItem, listStagger } from "../../lib/motion";
import { LoginBackdrop } from "./components/LoginBackdrop";
import { LoginForm } from "./components/LoginForm";

// Eager (not lazy): it is the first screen most visits see.
export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useSession();
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      <LoginBackdrop />
      <m.div
        variants={listStagger}
        initial="hidden"
        animate="visible"
        className="relative flex w-full max-w-sm flex-col gap-6"
      >
        <m.header variants={listItem} className="flex flex-col gap-2">
          <p className="text-5xl font-bold tracking-tight text-primary">{t("app.name")}</p>
          <p className="text-lg text-on-surface-variant">{t("login.subtitle")}</p>
        </m.header>
        <m.section variants={listItem} className="rounded-card bg-surface-container-lowest p-6 shadow-xl shadow-primary/5">
          <h1 className="mb-5 text-2xl font-semibold">{t("login.title")}</h1>
          <LoginForm onSubmit={signIn} />
        </m.section>
        <m.p variants={listItem} className="text-center text-sm text-on-surface-variant">
          {t("login.forgot")}
        </m.p>
      </m.div>
    </main>
  );
}
