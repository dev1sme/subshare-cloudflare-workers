import { m } from "motion/react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { Provider } from "../../shared/providers";
import { listItem, listStagger } from "../lib/motion";
import { PROVIDER_STYLE } from "../lib/providers";
import { ServiceLogo } from "./ServiceLogo";

// One provider's plans under its logo and name: YouTube, then its plans; Apple, then its plans.
// The section is a list item of the page's staggered list; its own plans stagger inside it.
export function ProviderSection({ provider, children }: { provider: Provider; children: ReactNode }) {
  const { t } = useTranslation();
  const label = PROVIDER_STYLE[provider].label ?? t("providers.other");
  return (
    <m.li variants={listItem} className="flex flex-col gap-3">
      <h2 className="flex items-center gap-3 px-1">
        <ServiceLogo provider={provider} name={label} className="size-9 rounded-xl text-xs" />
        <span className="text-lg font-bold tracking-tight">{label}</span>
      </h2>
      <m.ul variants={listStagger} className="flex flex-col gap-3">
        {children}
      </m.ul>
    </m.li>
  );
}
