# CompleteIt code flow guide

This guide explains how CompleteIt works without assuming that you already know React, Vite, Express, Prisma, React Query, or FastAPI. Read the first four sections for the big picture, then use the journey sections when you need to change or debug a feature.

## 1. The application in one picture

```text
Visitor's browser
    |
    | Opens pages and sends /api/v1 requests
    v
React frontend (apps/web, Vite locally on port 3000)
    |
    | Same-origin /api/v1/* proxy (Vite locally, Vercel in production)
    v
Express API (services/api, normally port 4000)
    |                 |                    |
    | Prisma          | HTTP               | S3-compatible API
    v                 v                    v
PostgreSQL        FastAPI AI service   Image storage
(users, sets,     (local text rules)   (Backblaze B2,
products, etc.)   port 8000            MinIO, etc.)
    |
    | Optional external AI requests are made by the Express API
    v
Gemini / Groq vision
```

The browser never receives database credentials, storage secrets, JWT signing secrets, or AI API keys. Those belong only in server environment variables.

## 2. What each folder is responsible for

| Folder | Responsibility |
|---|---|
| `apps/web` | Pages, forms, navigation, loaders, messages, and browser-side state. |
| `services/api` | Authentication, validation, business rules, database access, storage, AI-provider calls, and API responses. |
| `services/ai` | Free local text interpretation and rule-based fallback behavior. |
| `packages/contracts` | Shared Zod validation rules that define valid request bodies. |
| `packages/ui` | Small shared UI package. |
| `tests/e2e` | Playwright tests that behave like a real desktop or mobile visitor. |
| `infra` | Local Docker services such as PostgreSQL and MinIO. |
| `docs` | Architecture, privacy, QA, deployment, and this guide. |

## 3. The frontend: `apps/web`

The frontend uses React 19, Vite for development/builds, and React Router for navigation. `index.html` loads `main.tsx`, which mounts the providers and `app/router.tsx`. That router explicitly maps URLs to the existing React page components:

| File | Browser URL |
|---|---|
| `app/page.tsx` | `/` |
| `app/create/page.tsx` | `/create` |
| `app/explore/page.tsx` | `/explore` |
| `app/search/page.tsx` | `/search` |
| `app/my-sets/page.tsx` | `/my-sets` and its filter routes |
| `app/sets/[slug]/page.tsx` | `/sets/some-set-name` |
| `app/users/[username]/page.tsx` | `/users/aisha` |

The bracketed folder names are retained to avoid moving all the existing code; they no longer create routes automatically. React Router's `/sets/:slug` and `/users/:username` routes provide dynamic values through `useParams`. For example, `/sets/my-travel-kit` gives the set page a slug of `my-travel-kit`. Register every new URL in `app/router.tsx`.

### Browser-side React components

All pages now run in the browser without Next.js or `"use client"` directives. They can use:

- `useState` for values that change on screen.
- `useEffect` for work performed after a page opens.
- `localStorage` for drafts saved on the current device.
- Click and form-submit handlers.
- React Query for loading and refreshing API data.

Page code is lazy-loaded with React `Suspense`, using the existing loading UI. The router also wraps pages in an error boundary. `app/layout.tsx` retains the navigation and page spacing; `index.html` owns the title, description, and manifest link. `next-themes` is a standalone React theme library (it does not require Next.js), retained to preserve existing theme preferences.

### Calling the API

All browser API requests go through `apps/web/lib/api.ts`:

```ts
await api("/sets", {
  method: "POST",
  body: JSON.stringify(requestBody)
});
```

The helper adds `/api/v1`, includes the authentication cookies, parses JSON, and converts backend validation errors into readable messages.

`apps/web/vite.config.ts` proxies these requests during local development and build preview. On Vercel, `apps/web/vercel.json` forwards `/api/v1/*` to the existing Render API before falling back to `index.html` for frontend routes. The browser still uses `/api/v1/sets` and HttpOnly cookies. On another static host, configure equivalent proxy and SPA fallback rules; Vite's development proxy is not bundled into static output.

`lib/navigation.tsx` adapts the existing `href` links and imperative navigation calls to React Router. It retains filter navigation without scrolling and waits for asynchronous notification targets before scrolling to a comment or suggestion. Logout clears the client query cache so a later login does not reuse another user's cached data.

### Loading and refreshing data

React Query is configured in `apps/web/components/providers.tsx`. A typical query looks like:

```ts
const {data, isLoading, error} = useQuery({
  queryKey: ["set", slug],
  queryFn: () => api(`/sets/${slug}`)
});
```

- `queryKey` identifies cached data.
- `queryFn` loads it.
- `isLoading` controls the loader.
- `error` controls the local error message.
- `invalidateQueries` tells React Query to reload stale information after a change.

### Shared frontend pieces

- `components/nav.tsx`: desktop navigation, mobile navigation, profile menu, logout, and unread notification count.
- `components/set-card.tsx`: reusable set preview used by Home, Explore, Search, and My Sets.
- `components/action-feedback.tsx`: local loaders and success/error messages.
- `lib/analytics.ts`: sends a restricted, anonymous product event without blocking the user action.

## 4. The backend: `services/api`

The Express API follows a consistent request path:

```text
Route -> authentication -> validation -> controller -> service/repository -> Prisma -> PostgreSQL
```

### Routes

`services/api/src/routes/index.ts` is the API table of contents. It connects an HTTP method and URL to middleware and a controller.

Example:

```ts
router.post(
  "/sets",
  requireAuth,
  validate(createSetSchema),
  asyncHandler(sets.createSetController)
);
```

This says:

1. Accept `POST /api/v1/sets`.
2. Require a logged-in user.
3. Validate the JSON body using `createSetSchema`.
4. Run `createSetController`.
5. Pass async errors to the common error handler.

### Validation contracts

`packages/contracts/src/index.ts` contains Zod schemas. Zod rejects missing, incorrectly typed, or unsafe input before it reaches business logic.

If the UI sends `manualItems: null` where an array is expected, validation explains the incorrect field. Optional text fields preprocess `null` and empty strings so AI output does not cause unnecessary failures.

### Controllers

Controllers live in `services/api/src/controllers`. They translate HTTP requests into service calls and create HTTP responses.

Examples:

- `authController.ts`: register, login, logout, refresh, verification, and password reset.
- `analysisController.ts`: image upload analysis, text interpretation, object confirmation, and recommendations.
- `setController.ts`: create, read, edit, publish, copy, fork, checklist, and living-set updates.
- `discoveryController.ts`: Explore, Search, and Following feed.
- `socialController.ts`: follows, comments, ratings, suggestions, notifications, reports, blocks, and profiles.
- `analyticsController.ts`: accepts only the approved anonymous funnel events.

### Services and repositories

Services contain reusable business rules:

- `setService.ts`: creates a set, converts manual items to custom products, publishes, forks, copies, swaps, and updates checklist state.
- `recommendationService.ts`: builds the set audit and selectable recommendation paths.
- `geminiTextService.ts`: asks Gemini to interpret free text when configured.
- `geminiRecommendationService.ts`: asks Gemini for goal-specific missing-item ideas and rejects responses that drift away from the confirmed goal.
- `multimodalVisionService.ts`: tries configured image-recognition providers in order.
- `storageService.ts`: stores sanitized uploads in an S3-compatible provider.
- `localOcrService.ts`: local macOS OCR fallback.

`repositories/setRepository.ts` centralizes set queries and visibility rules. Keeping authorization here reduces the chance that one page accidentally exposes a private set.

### Prisma and PostgreSQL

`services/api/prisma/schema.prisma` describes the database. Important models include:

- `User` and `UserProfile`
- `Product` and `ProductCategory`
- `ProductSet`, `ProductSetItem`, and `ProductSetSlot`
- `AnalysisSession` and `DetectedObject`
- `RecommendationSession` and `Recommendation`
- `Notification`, `Comment`, `SetRating`, and `ProductSuggestion`
- `FeedEvent` for social activity and restricted product analytics

Prisma converts TypeScript calls into SQL. For example:

```ts
await prisma.productSet.findMany({
  where: {ownerId: userId},
  orderBy: {updatedAt: "desc"}
});
```

## 5. Login and session flow

```text
Login form
  -> POST /api/v1/auth/login
  -> validate email and password
  -> authController
  -> authService checks Argon2 password hash
  -> API creates short access token and refresh token
  -> tokens are returned as HttpOnly cookies
  -> browser navigates to /my-sets
```

JavaScript cannot read HttpOnly cookies. The browser sends them automatically because `api.ts` uses `credentials: "include"`.

Protected routes use `requireAuth`. Public pages use `optionalAuth` when the response changes slightly for a logged-in visitor.

Logout calls `POST /auth/logout`, clears server cookies, removes the frontend user state, and returns to `/login`.

## 6. Text-based set creation

The main frontend is `apps/web/app/create/page.tsx`.

```text
User describes goal
  -> interpret(description)
  -> POST /analysis/text
  -> Gemini interpreter when available
  -> local FastAPI/rule interpretation when Gemini fails
  -> editable outcome, budget, constraints, owned items, planned items
  -> user confirms items
  -> POST /recommendations
  -> recommendation service + optional Gemini goal planner
  -> audit, custom ideas, catalogue matches, comparison paths
  -> user selects items/path and title
  -> POST /sets
  -> private draft appears in My Sets
```

The UI never silently trusts AI. Every detected or interpreted item is editable before recommendations are created.

The creation page stores progress in `completeit-guest-draft` inside browser `localStorage`. Guests can register after building; the registration request includes this draft so it can be migrated into their new account.

## 7. Manual set creation

Manual creation uses the same page, but the user enters three things separately:

1. The intended goal.
2. Items already owned.
3. Items planned or wanted.

Each line may use:

```text
item name | category | brand | price
```

“Organize with AI” sends the combined text to `/analysis/text`. “Continue as entered” skips interpretation but keeps every entered item. Products not found in the catalogue are saved as custom, unverified products rather than being discarded.

## 8. Photo creation flow

```text
Photo input
  -> POST /uploads as multipart/form-data
  -> Sharp rotates, resizes, removes metadata, and converts to safe JPEG
  -> storageService saves sanitized bytes
  -> POST /analysis with uploadId
  -> multimodalVisionService tries:
       1. Groq vision
       2. Gemini vision
       3. OpenAI-compatible provider
       4. local macOS OCR
       5. honest manual fallback
  -> AnalysisSession + DetectedObject rows
  -> editable review screen
  -> PUT /analysis/:id/objects confirms corrected items
  -> goal and recommendation steps continue normally
```

The portable cloud flow depends on at least one configured vision provider. When providers are unavailable or rate-limited, the photo remains usable through manual confirmation; the application does not invent objects.

Check `GET /health`. `imageRecognition.activeProvider` explains which provider is currently active.

## 9. Recommendation flow

`POST /recommendations` receives:

- The exact outcome entered by the user.
- Budget and dimensional constraints.
- Owned catalogue product IDs.
- Confirmed owned and planned custom items.
- Desired categories inferred from the goal.
- New/used preference.

The backend first audits what is already covered, missing, duplicated, or incompatible. It then builds alternatives such as best value or mixed recommendations.

The frontend labels each alternative:

- **Complete path**: no required gaps remain.
- **Partial path**: useful matches exist, but some needs remain open.
- **Unavailable**: no useful products were found, so the path cannot be selected.

Uncatalogued AI ideas stay editable and are never disguised as real purchasable products.

## 10. Saving and checklist flow

The final creation step sends catalogue items and manual items to `POST /sets`. `setService.createSet`:

1. Loads real catalogue products by ID.
2. Ignores unknown IDs.
3. Creates custom product rows for manual items.
4. Calculates the demo total.
5. Creates a private draft with its items.

On a set detail page, the owner can mark a planned item as owned:

```text
Mark owned button
  -> PATCH /sets/:slug/items/:itemId
  -> requireAuth
  -> verify the current user owns the set
  -> update ProductSetItem.owned
  -> if every item is owned, mark the set COMPLETED
  -> reload set query
  -> update checklist percentage
```

Changing an item back to planned moves a completed set back to `DRAFT` when private or `ACTIVE` when shared.

## 11. Visibility and social features

Set visibility values are:

- `PRIVATE`: owner only.
- `FOLLOWERS`: authorized followers of the owner.
- `UNLISTED`: accessible with its link but excluded from Explore.
- `PUBLIC`: accessible and discoverable.

Publishing uses `POST /sets/:slug/publish`. The backend checks ownership and creates a feed event when a set first becomes public.

Public visitors can follow, comment, rate, suggest, copy, or fork where allowed. Social controllers create linked notifications containing the set title and a URL fragment that opens the relevant comment, rating, or suggestion.

## 12. Explore, Search, and Following

Explore calls `GET /explore`. The backend:

1. Loads compact public set summaries.
2. Ranks them into useful sections.
3. Ensures a set is not repeated across several sections.
4. Returns one `sets` collection and section `setIds`, avoiding repeated JSON objects.
5. Adds a short cache header to reduce repeated database work.

Search calls `GET /search` only after a visitor enters a query or filter. The API also returns empty arrays for a blank request, preventing an accidental full-catalogue download.

Following calls `GET /feed`. It returns actions from followed people and sets. Internal `ANALYTICS_*` events are explicitly excluded.

## 13. Notifications

The navigation loads `/notifications` for a logged-in visitor and refreshes periodically. It shows the unread count on the bell.

The notifications page supports:

- Marking one message read or unread.
- Marking every message read.
- Opening the linked set and relevant section.

The database uses `readAt`; a null value means unread.

## 14. Free first-party analytics

`apps/web/lib/analytics.ts` sends only allow-listed events:

- Landing viewed
- Creation started
- Input submitted
- AI result received
- Recommendation path selected
- Set saved
- Set shared
- Checklist progress changed
- Search submitted

It never sends goal text, search text, photos, email addresses, or passwords. A random anonymous browser UUID connects steps into a funnel. The API validates every event and stores it in the existing `FeedEvent` table, so no external analytics product is required.

Run a local report against the configured database:

```bash
npm run analytics:report -- 30
```

The report shows visitors at each step and basic conversion percentages.

## 15. Error handling and loaders

API errors pass through `middleware/errorHandler.ts` and use a consistent JSON structure. `api.ts` turns the most relevant backend field error into an ordinary JavaScript `Error`.

Frontend actions place feedback beside the action that caused it. Buttons are disabled while a request is running, and `releaseActionFocus` removes stale focus after completion. Longer AI and upload actions use `ActivityIndicator` so the user knows what is happening.

## 16. How to run and verify the project

From the repository root:

```bash
npm run dev
```

Usual local addresses:

- Web: `http://localhost:3000`
- API health: `http://localhost:4000/health`
- AI health: `http://localhost:8000/health`

Verification commands:

```bash
npm run typecheck
npm test
npm run build
npx playwright test
```

The API integration tests require local loopback-port access. The Playwright suite starts or reuses the frontend and tests both desktop Chromium and a mobile viewport.

## 17. Where to make common changes

| Desired change | Start here |
|---|---|
| Change Home page text | `apps/web/app/page.tsx` |
| Change navigation or logout | `apps/web/components/nav.tsx` |
| Change creation steps | `apps/web/app/create/page.tsx` |
| Change set-detail checklist | `apps/web/app/sets/[slug]/page.tsx` |
| Change Explore ranking | `services/api/src/controllers/discoveryController.ts` |
| Change search filters | Frontend `app/search/page.tsx`, backend `discoveryController.ts` |
| Change allowed request fields | `packages/contracts/src/index.ts` |
| Change set business rules | `services/api/src/services/setService.ts` |
| Change AI recommendations | `recommendationService.ts` and `geminiRecommendationService.ts` |
| Change photo provider order | `multimodalVisionService.ts` |
| Change database structure | `services/api/prisma/schema.prisma` |
| Add or update an API URL | `services/api/src/routes/index.ts` |
| Add a notification | `services/api/src/controllers/socialController.ts` |

## 18. A safe process for adding a feature

1. Describe the user action and expected result in plain language.
2. Decide what data must be stored.
3. Add or update the Zod request contract.
4. Add the backend route.
5. Add controller and service logic.
6. Add an API test for authorization and validation.
7. Add the frontend control, loader, and local feedback.
8. Invalidate affected React Query keys after success.
9. Add a Playwright test for the user journey.
10. Run type-check, tests, and build before deployment.

## 19. Small glossary

- **API**: URLs used by the frontend to request or change backend data.
- **Component**: A reusable piece of the React interface.
- **Controller**: Backend code that receives an HTTP request and returns a response.
- **Service**: Backend business logic reused by controllers.
- **Middleware**: Code that runs before a controller, such as authentication or validation.
- **Schema**: Either a database structure or a validation definition, depending on context.
- **Prisma**: The TypeScript database client and schema tool.
- **React Query**: The frontend data cache and request-state manager.
- **JWT**: A signed login token stored in an HttpOnly cookie.
- **Slug**: A readable identifier used in a URL.
- **Fallback**: A safer alternative used when the preferred service fails.
- **E2E test**: A browser test that exercises the application like a visitor.
