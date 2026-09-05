# CompleteIt

CompleteIt is a local-first, category-neutral collection builder. A guest can describe any goal in plain language, upload a photo, start from a catalogue item, or create manually; then separate what they own from what they want, receive an explainable completion plan, compare alternatives when the catalogue has relevant matches, and save a private set. Hobbies, food, travel, fitness, pets, crafts, home, work and technology are all supported without a fixed UI allow-list. No paid API, credit card or internet connection is needed after setup.

> Demo product information — live merchant data is not connected.

## What is included

- Next.js 16 App Router PWA with strict TypeScript, Tailwind, TanStack Query, responsive mobile navigation, accessibility labels and light/dark themes.
- Express API with route/controller/service/repository boundaries, Zod validation, Prisma/PostgreSQL, Argon2, rotated HttpOnly refresh cookies, Helmet, explicit CORS, rate limiting, Pino logs and Swagger.
- FastAPI service with a database-ontology-driven text interpreter, plus API-side portable multimodal object/label recognition, optional offline macOS OCR fallback and caller-supplied completion slots.
- PostgreSQL + pgvector image, Redis, MinIO and Mailpit containers.
- A diverse demo catalogue spanning technology, cooking, fitness, cycling, travel, photography, gardening, pets, crafts, music, camping, car care, food, parties and personal care; 5 users; public/unlisted sets; Product Worlds; compatibility edges; ratings; suggestions; comments; follows; updates and feed events.
- Free-form goals and dynamic completion plans. Unknown categories remain editable custom needs and never trigger unrelated technology recommendations.
- Real visibility authorization, private-by-default creation/migration/forks, Explore/search exclusions, fork attribution, Swap Impact, Living Set updates and small-sample suppression.

## Requirements

- Node.js 20 LTS or Node.js 22+
- npm 10+
- Python 3.11+
- Docker Desktop, Podman Compose, or another Docker Compose-compatible runtime

Node 21 can run the app but some development dependencies warn because it is a non-LTS release. Node 22 is recommended.

## Exact local startup

From this repository root:

```bash
cp .env.example .env
npm install
npm run setup
npm run dev
```

`npm run setup` starts local infrastructure, creates `services/ai/.venv`, installs Python packages, applies the Prisma schema and seeds deterministic demo data. It is safe to rerun; seeding resets demo records.

Open:

- Web app: http://localhost:3000
- API health: http://localhost:4000/health
- Swagger: http://localhost:4000/docs
- AI health/docs: http://localhost:8000/health and http://localhost:8000/docs
- Mailpit inbox: http://localhost:8025
- MinIO console: http://localhost:9001 (`completeit` / `completeit-local-secret`)

Stop application processes with `Ctrl+C`. Stop containers without deleting volumes:

```bash
npm run infra:down
```

## Test accounts

All local accounts and passwords are in [TEST_CREDENTIALS.md](./TEST_CREDENTIALS.md). A quick login is:

```text
aisha@completeit.local
CompleteIt@123
```

## Main journey

1. Open `/create` and describe any goal with local AI, upload a JPEG/PNG/WebP, start from a catalogue item, or enter unrestricted manual lists for “Already have” and “Want to add”. Unmatched items remain custom items.
2. Confirm every detected item, correct its visible brand when needed, and mark it as owned or planned. A deployed server with `GROQ_API_KEY`, `GEMINI_API_KEY`, or `OPENAI_API_KEY` uses portable multimodal recognition for general objects, brands, and readable labels; local macOS development retains offline packaging OCR as a fallback. Suggestions are never confirmed until you approve them.
3. Enter your own outcome in free text or use a generic action suggestion such as complete, organize, maintain, make portable or spend less. Budget and size are optional.
4. Review owned/missing/useful/optional/avoid audit data, evidence limits, unfilled slots and three genuinely different alternative sets.
5. Select products and save. Signed-in users save directly; guest drafts migrate into a private PostgreSQL set after registration.
6. Publish it, then use a second seeded user to follow, rate, comment, suggest and fork.
7. Add a simulated 30/90/180-day update through `POST /api/v1/sets/{slug}/updates`.

For the photo path, keep items mostly in frame, upload the image, and review every suggested name/category before continuing. The server removes EXIF metadata before analysis. See [DEPLOYMENT.md](./DEPLOYMENT.md) for portable vision, storage, cookie, CORS and SMTP configuration.

## Tests and verification

With infrastructure running and `.env` present:

```bash
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npx playwright test
npm audit --omit=dev
```

The API integration suite uses the seeded database and MinIO. Tests add temporary rows. `npm run db:seed` resets demo records, so do not run it when you need to preserve locally created sets. Existing installations can add the diverse catalogue and generic goals non-destructively with `npm run db:generic -w @completeit/api`.

## Repository map

```text
apps/web             Next.js PWA
services/api         Express/Prisma API and Supertest suite
services/ai          FastAPI mock/local-provider boundary and Pytest suite
packages/contracts   Shared Zod contracts
packages/ui          Shared accessible UI primitives
packages/config      Shared product constants
infra                Compose infrastructure
docs                 Architecture and privacy notes
tests/e2e            Playwright critical journeys
```

See [DEPLOYMENT.md](./DEPLOYMENT.md), [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and [docs/PRIVACY.md](./docs/PRIVACY.md) for deployment requirements, decisions and limitations.
