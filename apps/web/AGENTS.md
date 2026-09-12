# CompleteIt frontend

This is a client-rendered React application built with Vite, not Next.js.

- Register URLs explicitly in `app/router.tsx`; folders do not create routes.
- Keep existing page components, Tailwind styles, and the `/api/v1` contract intact.
- `lib/navigation.tsx` wraps React Router and preserves links, history, scroll options, and delayed hash targets.
- `vite.config.ts` proxies local API requests. `vercel.json` provides the production API proxy and SPA fallback. Never expose server secrets through `VITE_*` variables.
- Use Node 22.12+ (`nvm use` from the repository root), then run typechecking, build, and desktop/mobile regression tests for routing changes.
