# Career-Ops Production Dashboard

Multi-user web dashboard built on top of the Career-Ops CLI pipelines.

- **Auth**: Clerk (sign-in / sign-up / session, protected routes).
- **DB**: SQLite via Prisma.
- **AI**: Direct OpenAI HTTP calls (`evaluator`, `atsOptimizer`, `roadmapGenerator`).
- **Frontend**: Vite + React 18 + TypeScript + React Router.
- **Backend**: Express + TypeScript + helmet + rate-limit + zod validation.

## Architecture

```
web/
├── server/   (Express + Prisma + Clerk)
│   ├── prisma/schema.prisma
│   └── src/
│       ├── env.ts                  zod-validated env
│       ├── db/client.ts            shared PrismaClient
│       ├── middleware/auth.ts      Clerk + requireAuth + DB upsert
│       ├── middleware/error.ts     errorHandler + requestLogger
│       ├── services/
│       │   ├── openai.ts           chatComplete + safeJsonParse
│       │   ├── evaluator.ts        7-block JD report
│       │   ├── atsOptimizer.ts     ATS score, missing kw, rewrite
│       │   ├── roadmapGenerator.ts personalized 3-phase plan
│       │   ├── scanRunner.ts       runs scan.mjs + parses output
│       │   ├── pdfRenderer.ts      runs generate-pdf.mjs per user
│       │   ├── pdfExtract.ts       PDF -> text
│       │   ├── portalsService.ts   read/write portals.yml (surgical title_filter)
│       │   ├── keywordSuggester.ts AI: resume + role -> title keywords
│       │   └── repoPaths.ts        repo root + per-user storage
│       └── routes/
│           ├── me.ts
│           ├── resumes.ts          CRUD + upload + activate + PDF
│           ├── evaluations.ts      AI-rate-limited
│           ├── optimizations.ts    AI-rate-limited
│           ├── roadmaps.ts         AI-rate-limited
│           ├── scan.ts             run + list
│           └── portals.ts          read config + AI suggest + save title_filter
└── ui/       (Vite React + Clerk)
    ├── src/lib/        clerk + auth-aware API client
    ├── src/components/ AppShell, Markdown, ScoreGauge, AtsDiff, RoadmapView, ResumeUploader, ChipEditor
    └── src/pages/      Dashboard, Resumes, Evaluate, Optimize, Roadmap, Scanner, Targeting, Reports, Settings, SignIn, SignUp
```

## Setup

```bash
# 1) Install everything (server + ui)
npm run web:install

# 2) Server config
cp web/server/.env.example web/server/.env
# Edit web/server/.env and set:
#   CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, OPENAI_API_KEY

# 3) UI config
cp web/ui/.env.example web/ui/.env
# Edit and set VITE_CLERK_PUBLISHABLE_KEY (matches the server's publishable key)

# 4) Initial DB migration
npm run web:db:migrate
```

## Run (development)

In two terminals:

```bash
# Terminal 1 — backend (port 4310)
npm run web:server

# Terminal 2 — frontend (port 5173, proxies /api -> 4310)
npm run web:ui
```

Open <http://localhost:5173>. The UI redirects unauthenticated users to `/sign-in`.

## Build & run (production-style)

```bash
npm run web:build      # builds ui + server
npm run web:start      # serves ui from server's static dist + API on PORT (default 4310)
```

## Tests

```bash
npm run web:test
```

The suite covers the markdown parsers (evaluator), JSON parsing fallbacks (`safeJsonParse`), and the scan output parsers.

## API surface (all `/api/*` require Clerk Bearer token)

| Method | Path                              | Purpose                              |
| ------ | --------------------------------- | ------------------------------------ |
| GET    | `/api/me`                         | Profile + counts + config status     |
| GET    | `/api/resumes`                    | List user's resumes                  |
| POST   | `/api/resumes/upload`             | Multipart PDF/MD/TXT upload          |
| POST   | `/api/resumes`                    | Create from raw markdown             |
| GET    | `/api/resumes/:id`                | Full resume                          |
| PUT    | `/api/resumes/:id`                | Edit name/content                    |
| POST   | `/api/resumes/:id/activate`       | Set as active                        |
| DELETE | `/api/resumes/:id`                | Delete                               |
| POST   | `/api/resumes/:id/pdf`            | Render to PDF                        |
| GET    | `/api/resumes/:id/pdf/download`   | Download generated PDF               |
| POST   | `/api/evaluations`                | Run JD evaluation                    |
| GET    | `/api/evaluations[/:id]`          | List / get evaluation                |
| DELETE | `/api/evaluations/:id`            | Delete                               |
| POST   | `/api/optimizations`              | Run ATS optimizer                    |
| GET    | `/api/optimizations[/:id]`        | List / get optimization              |
| DELETE | `/api/optimizations/:id`          | Delete                               |
| POST   | `/api/roadmaps`                   | Generate roadmap                     |
| GET    | `/api/roadmaps[/:id]`             | List / get roadmap                   |
| DELETE | `/api/roadmaps/:id`               | Delete                               |
| POST   | `/api/scan/run`                   | Run scan.mjs and persist results     |
| GET    | `/api/scan/results`               | List recent results                  |
| GET    | `/api/portals`                    | Read parsed portals.yml (filters + companies) |
| PUT    | `/api/portals/title-filter`       | Save positive/negative keywords (surgical write) |
| POST   | `/api/portals/suggest`            | AI: derive title keywords from active resume + target role |

## Hardening

- **Helmet** for security headers.
- **express-rate-limit** (30 req/min/IP) on AI endpoints (`/api/evaluations`, `/api/optimizations`, `/api/roadmaps`).
- **Zod** validation on every body and on env at boot.
- **Centralized error middleware** with safe messages and `HttpError` class.
- **Per-user file storage** under `web/server/storage/<safeUserId>/` with safe-path checks on download.
- **Cascading deletes** in Prisma keep storage tidy when a user/resume is removed.
- **Request logger** with timing in dev/prod.

## Env variables

### `web/server/.env`

| Var                       | Required | Default                     |
| ------------------------- | -------- | --------------------------- |
| `DATABASE_URL`            | yes      | `file:./career-ops.db`      |
| `CLERK_PUBLISHABLE_KEY`   | yes      | —                           |
| `CLERK_SECRET_KEY`        | yes      | —                           |
| `OPENAI_API_KEY`          | for AI   | empty (AI returns 503)      |
| `OPENAI_MODEL`            | no       | `gpt-4o-mini`               |
| `PORT`                    | no       | `4310`                      |
| `ALLOWED_ORIGIN`          | no       | `http://localhost:5173`     |
| `NODE_ENV`                | no       | `development`               |

### `web/ui/.env`

| Var                            | Required | Default                                 |
| ------------------------------ | -------- | --------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY`   | yes      | —                                       |
| `VITE_API_URL`                 | no       | empty (uses Vite proxy `/api` in dev)   |

## Notes

- The legacy CLI scripts (`gemini-eval.mjs`, `scan.mjs`, `generate-pdf.mjs`, etc.) remain untouched and continue to work standalone.
- The dashboard does **not** spawn `gemini-eval.mjs` for evaluation/optimization/roadmaps — it calls OpenAI directly so it's resilient to shell quoting issues on Windows.
- Scanner and PDF generation still spawn the existing Node scripts but with safe argument arrays (no shell quoting).
- The **Targeting** page in the UI lets users personalize the scanner without touching YAML: it reads the active resume + an optional target role, asks the AI for positive/negative title keywords, lets the user accept/edit chips, and surgically writes only the `title_filter:` block back to `portals.yml` (preserving comments, companies, and search queries elsewhere in the file, including the original CRLF/LF convention).
