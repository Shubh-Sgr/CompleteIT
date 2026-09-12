# CompleteIt architecture

CompleteIt is a local-first monorepo. The React + Vite frontend calls the versioned Express API through a same-origin `/api/v1` proxy (Vite locally, Vercel rewrites in production); Express owns authorization and persistent business rules. React Router registers the existing URLs in `apps/web/app/router.tsx`. PostgreSQL is the permanent source of truth. Redis is reserved for disposable caches/rate-limit/job state, MinIO holds images, and Mailpit captures development email. The FastAPI service provides a truthful mock vision provider and deterministic completion rules without a paid model.

The API follows route → controller → service → repository boundaries. Routes validate external inputs with Zod, controllers translate HTTP, services implement operations such as recommendations/forking/swaps, and repositories centralize privacy-aware set access. Secure cookies carry short access and rotated refresh tokens.

## Recommendation explanation

Candidates start from outcome/anchor complement rules. Already-owned categories receive a redundancy penalty and appear under “probably don’t need this.” Remaining candidates are filtered by budget, ranked by seeded rating and fit, and marked “likely” or “more information required” unless a seeded compatibility edge supports confirmation. Product power/load details intentionally remain unconfirmed without exact specifications.

## Survival score

The current explainable score is retained state updates divided by all tracked product-state updates. It is returned only after three updates. The UI and API do not make cohort-level statistical claims for smaller samples.
