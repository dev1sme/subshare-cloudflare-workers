# UI

Spec: `docs/design-system.md` (tokens, type, interaction) and `docs/architecture.md#phân-tầng-client` (layering). Read both before adding a component, a colour, or a screen.

Must hold:

- Material 3 Expressive, service-first: a plan is shown by its provider's logo (`ServiceLogo`, from `plans.provider`), money is a property of the plan. No decorative shapes.
- Colours are M3 role tokens in `src/client/index.css` (`bg-primary-container`, `text-on-surface-variant`), never raw hex in a component (exceptions: `QrCode`, `ServiceLogo`'s brand colour, and `public/favicon.svg`, which must be edited by hand when the palette changes). The palette comes from `scripts/generate-palette.mjs` — regenerate, do not hand-edit single colours.
- Logos are Simple Icons paths bundled from `simple-icons`, never a CDN or logo service.
- `error` means money owed (`UNPAID`) or an action that cannot be undone; `warning` = `PENDING`; `success` = `PAID`. The brand colour (`primary`) carries no money meaning.
- Motion goes through `motion/react` `m.*` components and the shared tokens in `src/client/lib/motion.ts`; never import `motion` (the non-lazy component) — `<LazyMotion strict>` throws on it. Animations present state, they never decide it. Respect reduced motion. 1–2 main motions per screen. Never `AnimatePresence mode="popLayout"` — it injects a `<style>` tag that CSP blocks.
- Payment status is never conveyed by colour alone: always a text label.
- Touch targets ≥ 44px (`min-h-11`); focus ring always visible; icon-only buttons carry `aria-label`; decorative icons `aria-hidden`. Lucide SVG, no emoji.
- Fonts are self-hosted (`@fontsource`), never a CDN — CSP is `font-src 'self'`.
- Loading shows a `Skeleton` shaped like the real screen, not a centred spinner.
- Toasts: `toast.success` / `toast.error` from Sonner. Confirmation: `useConfirm()`, never `window.confirm`.
- `components/ui/` follows the shadcn pattern by hand (`cn()` + tokens); the `shadcn` CLI needs `npx`, which does not work here.
- Router is the declarative `<BrowserRouter>`, not a data router: a data router's `errorElement` would swallow lazy-chunk errors before `ChunkErrorBoundary`.
- UI copy lives in `src/client/i18n/locales/vi.ts` and `en.ts` with the same keys; `en.ts` is typed from `vi.ts`, so a missing key fails `typecheck`.
