import { m } from "motion/react";
import { useTranslation } from "react-i18next";
import type { Provider } from "../../../shared/providers";
import { BrandLogo } from "../../components/BrandLogo";
import { ServiceLogo } from "../../components/ServiceLogo";
import { useSession } from "../../hooks/useSession";
import { listItem, listStagger } from "../../lib/motion";
import { LoginForm } from "./components/LoginForm";

// What the app is about, before a word is read. A fixed set — signed out, there is no plan list to
// draw from.
const SHOWCASE: Provider[] = ["YOUTUBE", "SPOTIFY", "NETFLIX", "APPLE", "GOOGLE"];

// Eager (not lazy): it is the first screen most visits see.
export default function LoginPage() {
  const { t } = useTranslation();
  const { signIn } = useSession();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <m.div variants={listStagger} initial="hidden" animate="visible" className="flex w-full max-w-sm flex-col gap-6">
        <m.header variants={listItem} className="flex flex-col gap-4">
          <m.ul variants={listStagger} className="flex gap-2" aria-hidden="true">
            {SHOWCASE.map((provider) => (
              <m.li key={provider} variants={listItem}>
                <ServiceLogo provider={provider} name={provider} className="size-11 rounded-xl" />
              </m.li>
            ))}
          </m.ul>
          <div className="flex flex-col gap-1">
            <p className="flex items-center gap-2 text-4xl font-bold tracking-tight">
              <BrandLogo className="size-11" />
              {t("app.name")}
            </p>
            <p className="text-lg text-on-surface-variant">{t("login.subtitle")}</p>
          </div>
        </m.header>
        <m.section variants={listItem} className="rounded-card border border-outline-variant/60 bg-surface-container-lowest p-6">
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
