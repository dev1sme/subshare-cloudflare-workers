import { siApple, siClaude, siDuolingo, siGoogle, siNetflix, siNotion, siSpotify, siYoutube } from "simple-icons";
import type { Provider } from "../../shared/providers";

// How each provider is drawn (docs/design-system.md#logo-dịch-vụ). Logos are Simple Icons paths
// (CC0), bundled — never fetched from a CDN (img-src 'self'). Brands that asked Simple Icons to
// remove their logo (Microsoft, OpenAI, Canva) get their initial in the brand colour instead.
// Brand names are proper nouns and stay untranslated; OTHER has no brand and no label here.
type ProviderStyle = { label: string | null; color: string; path: string | null };

const icon = (si: { title: string; hex: string; path: string }): ProviderStyle => ({
  label: si.title,
  color: `#${si.hex}`,
  path: si.path,
});

export const PROVIDER_STYLE: Record<Provider, ProviderStyle> = {
  YOUTUBE: icon(siYoutube),
  SPOTIFY: icon(siSpotify),
  NETFLIX: icon(siNetflix),
  APPLE: icon(siApple),
  GOOGLE: icon(siGoogle),
  MICROSOFT: { label: "Microsoft", color: "#0078D4", path: null },
  OPENAI: { label: "OpenAI", color: "#000000", path: null },
  CLAUDE: icon(siClaude),
  CANVA: { label: "Canva", color: "#7D2AE8", path: null },
  DUOLINGO: icon(siDuolingo),
  NOTION: icon(siNotion),
  OTHER: { label: null, color: "", path: null },
};

export type ProviderGroup<T> = { provider: Provider; items: T[] };

// Groups keep the order the items came in (the API sorts by name); groups are ordered by brand
// name, with OTHER last.
export function groupByProvider<T extends { provider: Provider }>(items: T[]): ProviderGroup<T>[] {
  const groups = new Map<Provider, T[]>();
  for (const item of items) {
    const list = groups.get(item.provider);
    if (list) list.push(item);
    else groups.set(item.provider, [item]);
  }
  return [...groups.entries()]
    .map(([provider, list]) => ({ provider, items: list }))
    .sort((a, b) => {
      if (a.provider === "OTHER") return 1;
      if (b.provider === "OTHER") return -1;
      return (PROVIDER_STYLE[a.provider].label ?? "").localeCompare(PROVIDER_STYLE[b.provider].label ?? "", "vi");
    });
}
