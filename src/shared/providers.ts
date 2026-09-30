// The service a plan is for. Mirrors the CHECK on plans.provider (migration 0007): adding a value
// means a table rebuild there and a logo / colour in src/client/lib/providers.ts.
export const PROVIDERS = [
  "YOUTUBE",
  "SPOTIFY",
  "NETFLIX",
  "APPLE",
  "GOOGLE",
  "MICROSOFT",
  "OPENAI",
  "CLAUDE",
  "CANVA",
  "DUOLINGO",
  "NOTION",
  "OTHER",
] as const;

export type Provider = (typeof PROVIDERS)[number];
