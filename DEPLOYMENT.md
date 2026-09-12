# CompleteIt production deployment

CompleteIt is portable across desktop and mobile browsers because all recognition and business logic run on the server. A production installation needs the static React web app, Express API, FastAPI interpreter and PostgreSQL, plus S3-compatible object storage and SMTP. Redis is optional with the current code. The frontend no longer requires a Next.js server.

## Required topology

| Component | Start command | Required backing service |
|---|---|---|
| Web | `npm run build -w @completeit/web`; serve `apps/web/dist` on a static host | Same-origin API proxy and SPA fallback configured on the host |
| API | `npm run build -w @completeit/api` then `npm run start -w @completeit/api` | PostgreSQL, S3-compatible storage, SMTP, AI service |
| AI | `pip install -r services/ai/requirements.txt` then `uvicorn app.main:app --host 0.0.0.0 --port $PORT` from `services/ai` | None for text interpretation |
| Database | Managed PostgreSQL 16+ | `pgvector` extension is included by the local image but is not currently required by the active ranking path |

Do not deploy the development defaults for JWT, storage or email secrets.

## React frontend on the existing Vercel project

No new service or paid dependency is required for this migration. Keep the existing domain and Render/Neon/storage services.

1. Use **Root Directory: `apps/web`**, **Node.js: 22.x**, **Framework Preset: Vite**, **Build Command: `npm run build`**, and **Output Directory: `dist`**. The checked-in `apps/web/vercel.json` declares the framework/build/output values; remove any conflicting dashboard overrides from the former Next.js setup.
2. Deploy the migrated commit. The config proxies `/api/v1/*` to `https://completeit-api.onrender.com/api/v1/*`, and sends frontend deep links to `index.html`. If your API hostname changes, update that first rewrite too; a Vite environment variable cannot alter a static host's routing rules.
3. Keep API secrets on the API service only. Do not copy database, JWT, storage, Groq, or Gemini keys into any `VITE_*` variable.
4. Verify direct visits and refreshes at `/create`, `/my-sets/private`, and an existing `/sets/<slug>` URL; then test login, save, upload, notifications, and logout through the deployed frontend.

`npm run start -w @completeit/web` previews the production bundle locally at port 3000. It is not a production server. A different static host needs equivalent `/api/v1` reverse-proxy rules **before** the SPA fallback; otherwise API requests or login cookies can break. The static frontend does not server-render page content: the initial HTML contains metadata and a React mount point. This differs from Next.js pre-rendering for crawlers/no-JavaScript visitors, although the interactive UI is preserved.

## Portable image recognition

Production image recognition is server-side and therefore independent of the visitor's device or browser. For a free-tier deployment, use Groq Qwen vision for photos. Set these only on the API service:

```text
GROQ_API_KEY=...
GROQ_BASE_URL=https://api.groq.com/openai/v1
GROQ_VISION_MODEL=qwen/qwen3.6-27b
VISION_TIMEOUT_MS=120000
```

Keep Gemini configured for text interpretation and goal planning; it also acts as the second photo provider if Groq is temporarily unavailable:

```text
GEMINI_API_KEY=...
GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta
GEMINI_MODEL=gemini-3.6-flash
GEMINI_FALLBACK_MODELS=gemini-3.1-flash-lite,gemini-3.5-flash
GEMINI_TEXT_MODEL=gemini-3.1-flash-lite
GEMINI_TEXT_TIMEOUT_MS=45000
VISION_TIMEOUT_MS=120000
```

Optionally, add an OpenAI-compatible provider as a third photo fallback:

```text
OPENAI_API_KEY=...
OPENAI_BASE_URL=https://api.openai.com/v1
VISION_MODEL=gpt-5.6-luna
VISION_TIMEOUT_MS=120000
```

The API removes EXIF metadata, rotates and bounds the image, converts it to JPEG, and asks the configured multimodal model for structured JSON output. Results include visible evidence and confidence, and always require user confirmation. API keys are never sent to the browser; the OpenAI-compatible request also uses `store: false`.

Provider order:

1. Groq Qwen vision when `GROQ_API_KEY` is configured.
2. Gemini vision when `GEMINI_API_KEY` is configured.
3. The OpenAI-compatible provider when `OPENAI_API_KEY` is configured.
4. Apple Vision text OCR on a local macOS API host.
5. Honest manual confirmation when no provider succeeds.

Check `GET /health`. `imageRecognition.activeProvider` should be `groq-qwen`, `gemini`, or `openai-compatible` on a Linux cloud host. If it says `manual-fallback`, photo upload still works but automatic recognition is not configured.

## Object storage

Use MinIO, AWS S3, Cloudflare R2, Backblaze B2 or another S3-compatible service. Create the bucket before starting the API.

```text
MINIO_ENDPOINT=https://your-s3-compatible-endpoint
MINIO_PORT=443
MINIO_USE_SSL=true
MINIO_FORCE_PATH_STYLE=true
MINIO_REGION=auto
MINIO_ACCESS_KEY=...
MINIO_SECRET_KEY=...
MINIO_BUCKET=completeit
```

For AWS S3 use its HTTPS endpoint, real AWS region and `MINIO_FORCE_PATH_STYLE=false`. Despite the legacy variable prefix, these settings are provider-neutral.

## Web, API and cookies

```text
# Local Vite development/preview proxy (production routing is in vercel.json)
API_PROXY_ORIGIN=http://localhost:4000

# API service
WEB_URL=https://app.example.com
WEB_URLS=https://app.example.com,https://www.example.com
API_PUBLIC_URL=https://api.example.com
AI_URL=https://completeit-ai.example.com
COOKIE_SECURE=true
COOKIE_SAME_SITE=lax
```

The browser calls the frontend origin's `/api/v1` path, so the host proxy preserves same-origin cookies even when the backend uses a Render hostname. Keep `COOKIE_SECURE=true` in HTTPS production, and retain the existing cookie settings. Add every permitted frontend origin to `WEB_URLS`; do not use a wildcard with credentialed requests. `NEXT_PUBLIC_API_URL` is still accepted as a legacy local proxy setting, but is not exposed in the React bundle. Do not bypass the proxy with direct cross-origin browser requests.

## Database and email

```text
DATABASE_URL=postgresql://...
JWT_ACCESS_SECRET=<long random secret>
JWT_REFRESH_SECRET=<different long random secret>
EMAIL_TOKEN_SECRET=<different long random secret>
MAIL_HOST=smtp.example.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=...
MAIL_PASSWORD=...
MAIL_FROM=CompleteIt <no-reply@example.com>
```

Run `npm run db:push -w @completeit/api` once, then `npm run db:seed -w @completeit/api` for a new demo database. Seeding resets demo records. Use `npm run db:generic -w @completeit/api` to add the diverse catalogue to an existing database without resetting user data.

## Release verification

Before directing traffic to a deployment:

```bash
npm run typecheck
npm run test
npm run build
npx playwright test
```

Then verify `/health` for both API and AI, create a set from text, upload a real photo, save it, publish it, log out/in, follow/unfollow, and request a password-reset email against the production URLs.

## Free, first-party product analytics

CompleteIt records a small allow-listed funnel (`landing_view`, creation, AI result, save, share, search and checklist progress) in the existing PostgreSQL `FeedEvent` table. It does not require Google Analytics, PostHog, cookies from an advertising vendor or another paid service. The anonymous browser identifier is a random UUID and event properties are deliberately restricted; text descriptions, photos, email addresses and search text are not recorded.

Generate a 30-day funnel report locally against the configured database:

```bash
npm run analytics:report
```

Pass a different lookback period in days when needed:

```bash
npm run analytics:report -- 7
```

No application can guarantee identical availability on every hosting provider: the host must support long-running Node/Python services, PostgreSQL, outbound HTTPS for vision, and S3/SMTP connectivity. Static-only hosting can host the web frontend, but not the API or AI services.
