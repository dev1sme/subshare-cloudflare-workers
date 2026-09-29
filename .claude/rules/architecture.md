# Architecture

Spec: `docs/architecture.md` (layout, layering, code splitting, UI conventions). Read it before adding a file, moving code between layers, touching the Vite/Wrangler build, or writing a hook or page.

Must hold:

- One Worker serves SPA + `/api/*`, built with `@cloudflare/vite-plugin`. No Pages project, no `wrangler pages deploy`, no meta-framework.
- `run_worker_first = ["/api/*"]` with `not_found_handling = "single-page-application"`. A new prefix outside `/api` must be added there or it answers `index.html` with 200.
- Route handlers never write SQL — that lives in `src/server/db/`, one module per table. Money arithmetic (splitting a price into shares) lives in `src/server/domain/`, pure and testable without a database.
- Client never imports from `src/server/`, only `src/shared/`.
- `*Page.tsx` composes only: no `api.ts`, no table/modal JSX, no `try/catch`. `use*.ts` owns data + mutations (return `Promise<boolean>`, raise own toast). Feature components never import `api.ts`.
- Anything passed into a child's `useEffect` is memoised (`useCallback` / `useMemo`) — an unmemoised function or array there renders in a loop.
- Confirm via an in-app dialog hook, never `window.confirm`.
- Every screen behind login is `React.lazy`; the login page, the not-found page and the layouts stay eager. `<Suspense>` inside each layout. A chunk-load error boundary reloads once after a deploy.
- Everything in code is English: URLs, dirs, columns, fields, codes, enums **and every identifier**. Vietnamese lives only in UI copy (`locales/vi.ts`) and outgoing message text.
