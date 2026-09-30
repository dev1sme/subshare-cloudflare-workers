# UI

Spec: `docs/design-system.md` (tokens, type, interaction) and `docs/architecture.md#phân-tầng-client` (layering). Read both before adding a component, a colour, or a screen.

Must hold:

- Colours come from the tokens in `src/client/index.css` (`bg-primary`, `text-owed`), never raw hex in a component.
- Red (`destructive`, `owed`) means money owed or an action that cannot be undone — never a plain call to action.
- Payment status is never conveyed by colour alone: always a text label.
- Touch targets ≥ 44px (`min-h-11`); focus ring always visible; icon-only buttons carry `aria-label`; decorative icons `aria-hidden`. Lucide SVG, no emoji.
- Fonts are self-hosted (`@fontsource`), never a CDN — CSP is `font-src 'self'`.
- Toasts: `toast.success` / `toast.error` from Sonner. Confirmation: `useConfirm()`, never `window.confirm`.
- `components/ui/` follows the shadcn pattern by hand (`cn()` + tokens); the `shadcn` CLI needs `npx`, which does not work here.
- Router is the declarative `<BrowserRouter>`, not a data router: a data router's `errorElement` would swallow lazy-chunk errors before `ChunkErrorBoundary`.
- UI copy lives in `src/client/i18n/locales/vi.ts` and `en.ts` with the same keys; `en.ts` is typed from `vi.ts`, so a missing key fails `typecheck`.
