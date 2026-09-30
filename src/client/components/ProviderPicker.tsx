import { useTranslation } from "react-i18next";
import { PROVIDERS, type Provider } from "../../shared/providers";
import { ServiceLogo } from "./ServiceLogo";
import { cn } from "../lib/cn";
import { PROVIDER_STYLE } from "../lib/providers";

// The service a plan is for, picked by its logo. A group of toggle buttons (one pressed).
export function ProviderPicker({ value, onChange, legend }: { value: Provider; onChange: (provider: Provider) => void; legend: string }) {
  const { t } = useTranslation();
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 px-1 text-sm font-medium text-on-surface-variant">{legend}</legend>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {PROVIDERS.map((provider) => {
          const label = PROVIDER_STYLE[provider].label ?? t("providers.other");
          const selected = provider === value;
          return (
            <button
              key={provider}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(provider)}
              className={cn(
                "state-layer relative flex min-h-11 cursor-pointer flex-col items-center gap-1.5 overflow-hidden rounded-2xl border px-2 py-2.5 text-xs font-semibold transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-primary",
                selected ? "border-primary bg-primary-container text-on-primary-container" : "border-outline-variant text-on-surface-variant",
              )}
            >
              <ServiceLogo provider={provider} name={label} className="size-9 rounded-xl text-xs" />
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
