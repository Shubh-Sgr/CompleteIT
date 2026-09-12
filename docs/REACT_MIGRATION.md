# React frontend migration — 2026-09-11

## Result

The frontend now uses React 19 + React Router 7 + Vite 8. Next.js is no longer installed or required. Existing pages, CSS, responsive layouts, API paths, metadata, and theme storage were retained. No backend source, database schema, AI-provider configuration, or existing dependency version was changed. Tests created additional local demo records; no production data was written.

## Code entry points

- `apps/web/index.html`: document title, description, viewport and manifest.
- `apps/web/main.tsx`: mounts React, the existing providers, and the router.
- `apps/web/app/router.tsx`: explicit route map, lazy loading and error boundary. Existing bracketed page folders are retained for familiarity; they no longer register URLs automatically.
- `apps/web/app/layout.tsx`: unchanged navigation and page layout markup.
- `apps/web/lib/navigation.tsx`: React Router links, push/replace, scroll restoration and deferred notification hash targets.
- `apps/web/vite.config.ts`: local development/preview and same-origin API proxy. Parses proxy settings without letting the root development environment select development React for production builds.
- `apps/web/vercel.json`: Vite build settings, existing Render API proxy, frontend deep-link fallback.

`next-themes` remains deliberately: it is a standalone React theme library, not the Next.js framework. Retaining it preserves saved light/dark/system preferences.

One existing bug surfaced in browser logs: the shared API helper parsed logout's HTTP 204 response as JSON. It now accepts empty 204/205 responses. Logout also clears the React Query cache instead of calling the removed Next.js refresh method.

## Verification

| Check | Result |
| --- | --- |
| Workspace TypeScript/Python checks | Passed |
| Full frontend, contracts and API production build | Passed |
| API unit/integration tests | 45 passed |
| Python AI tests | 5 passed |
| Production-build Playwright tests | 34 passed, desktop Chromium and Pixel 7 emulation |
| Direct visits and refreshes | 26 existing URL variants plus unknown-route handling, on both viewports |
| Next.js package dependency | None (`npm ls next --all`) |
| Production React development runtime / local server credential values in browser bundle | Not found |
| Existing production API `/health` | Healthy; Gemini configured |

Browser coverage includes category-neutral text/manual creation, photo upload and honest fallback, guest migration handoff, catalogue anchor query parameters, brands and owned/planned status, saving/editing titles, publishing, following/unfollowing, My Sets filters/search/sort, profile/product/world/compare/fork routes, notification read/unread and exact comment redirects, logout and cookie persistence, dark theme, browser history, and scroll restoration. The new migration tests fail on unhandled browser errors.

Before/after screenshots were captured at 1440×1000 and 393×851 for Home, Create, Login and Explore. At a 15/255 channel-difference threshold, the observed differing pixel percentages were:

| Page | Desktop | Mobile |
| --- | --- | --- |
| Home | 0.130% | 0.000% |
| Create | 0.000% | 0.000% |
| Login | 0.000% | 0.001% |
| Explore | 0.000% | 0.001% |

Sampled pages were visually inspected. These are spot comparisons, not a claim that every possible state is pixel-identical.

## Limitations and deployment

- This is now client-rendered React. Interactive pages are preserved, but initial HTML no longer contains Next.js pre-rendered page content. Crawlers/no-JavaScript behavior and HTTP handling of unknown frontend routes differ from server-rendered Next.js. Metadata and the web app manifest remain.
- At migration verification, no commit, GitHub push or deployment had been performed; subsequent publication is a separate step. Before deploying, confirm Vercel uses root `apps/web`, preset **Vite**, Node **22.x**, output **dist**, and the checked-in proxy rules. The production-build tests used local Vite preview; they do not substitute for a post-deployment Vercel smoke test.
- No new paid service is required. Existing hosting/provider quotas, cold starts, image-recognition availability and accuracy are unchanged. The photo test checks upload/review/fallback behavior, not live model accuracy on all images.
- `npm audit` reports 7 existing alerts (6 moderate, 1 high) in the older API/test dependency tree. The affected locked versions (`vite` 5.4.21 under the existing test tooling, `vitest` 3.2.7 and `qs` 6.15.3) predate this migration. The frontend uses Vite 8.3.0. No unrelated dependency upgrade was applied.

See [DEPLOYMENT.md](../DEPLOYMENT.md) for hosting settings and [CODE_FLOW_GUIDE.md](CODE_FLOW_GUIDE.md) for the updated frontend/backend walkthrough. Framework references: [Vite guide](https://vite.dev/guide/), [React Router routing](https://reactrouter.com/start/declarative/routing), [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).
