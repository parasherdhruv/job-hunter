# Autonomous Job Hunter

A single-user job-search workspace: keep a candidate profile, track opportunities,
see an explainable match score for each one, and follow every application from
saved to offer.

This repository contains the **Phase 1 foundation**. It does not discover jobs
automatically and never submits applications on your behalf.

## What Phase 1 includes

- Candidate profile: name, headline, experience, skills, preferred titles,
  locations, salary expectations, work-mode preference and resume upload.
- Job management: full CRUD, duplicate protection, pagination, filtering and
  seven-state application tracking.
- Explainable matching: a deterministic 100-point score with a per-factor
  breakdown, matched and missing skills, and plain-language reasons.
- Responsive dashboard: overview, profile, job list, job detail and applications.
- Authentication: single-user session cookies, rate limiting, validation and
  Helmet security headers.
- Tests: scoring unit tests, API integration tests and frontend workflow tests.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Tailwind CSS v4 |
| Backend | NestJS 10, Node.js 22, TypeScript (strict) |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Package manager | pnpm workspaces |
| Hosting | Railway |

## Repository layout

```
apps/api             NestJS API (auth, candidate, jobs, matching, health)
apps/web             Next.js dashboard
packages/shared      Shared TypeScript contract types used by both apps
docker-compose.yml   Local PostgreSQL
```

## Requirements

- Node.js 22+
- pnpm 10+
- Docker (for the local PostgreSQL container)

## Run locally

```bash
cp .env.example .env          # adjust secrets if you like
docker compose up -d          # start PostgreSQL
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm db:seed                  # optional: sample profile and jobs
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:4000/api
- Health: http://localhost:4000/api/health
- API docs (Swagger): http://localhost:4000/api/docs

Sign in at `/login` with `AUTH_USERNAME` / `AUTH_PASSWORD` from your `.env`
(defaults: `admin` / `change-me-now`). Change these before deploying.

### How the web app talks to the API

The browser always calls `/api/*` on the Next.js origin. Next.js proxies those
requests to `API_PROXY_TARGET` (default `http://localhost:4000`). This keeps the
session cookie first-party and removes the need for CORS in the default setup.

## Useful commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Run API and web together |
| `pnpm build` | Build shared, web and API |
| `pnpm typecheck` | TypeScript checks across the workspace |
| `pnpm test` | Run every test suite |
| `pnpm db:migrate` | Create/apply a development migration |
| `pnpm db:deploy` | Apply pending migrations (production) |
| `pnpm db:seed` | Seed the sample profile and jobs |
| `pnpm docker:up` / `pnpm docker:down` | Start/stop local PostgreSQL |

## API routes

All routes are under `/api` and require an authenticated session except
`/api/health`, `/api/auth/login` and `/api/docs`.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Service and database status |
| POST | `/auth/login` | Start a session |
| POST | `/auth/logout` | End the current session |
| GET | `/auth/me` | Current user |
| GET | `/candidate/profile` | Read the candidate profile |
| PUT | `/candidate/profile` | Create or update the profile |
| POST | `/candidate/resume` | Upload a resume (PDF/DOC/DOCX) |
| DELETE | `/candidate/resume` | Remove the stored resume |
| POST | `/jobs` | Create a job |
| GET | `/jobs` | List jobs (filters, sorting, pagination) |
| GET | `/jobs/stats` | Application counts per status |
| GET | `/jobs/matches` | All jobs ranked by match score |
| GET | `/jobs/:id` | Job detail |
| GET | `/jobs/:id/match` | Explainable score for one job |
| PUT | `/jobs/:id` | Update a job |
| PATCH | `/jobs/:id/status` | Update application status |
| DELETE | `/jobs/:id` | Delete a job |

Responses use a consistent envelope: `{ success, data, error }`.

## Matching model

The score is deterministic — identical inputs always produce identical output —
and is bounded to 0–100.

| Factor | Weight |
|---|---|
| Technical skills | 40 |
| Job-title relevance | 20 |
| Location compatibility | 15 |
| Salary compatibility | 15 |
| Experience compatibility | 10 |

Each factor returns its points, its maximum, and a sentence explaining the
result. Skills are canonicalised so `React.js` and `React` compare equal, and
the response echoes the job's original spelling for display. Missing job
information (no salary, no skills, unknown location) is handled with a neutral
or conservative score plus a note rather than an error. The score is a fit
heuristic, not a probability of being hired.

## Testing

```bash
pnpm test          # all suites
pnpm test:api      # scoring unit tests + API integration tests
pnpm test:web      # API client, status control and login form tests
```

API integration tests run against a real PostgreSQL schema (`?schema=test`), so
start PostgreSQL first and copy `.env.test.example` to `.env.test`.

## Deploy to Railway

Two services plus a managed database, all in one Railway project.

### 1. PostgreSQL

Add the PostgreSQL plugin. Railway exposes `DATABASE_URL`; reference it from the
API service as `${{Postgres.DATABASE_URL}}`.

### 2. API service

- Source: this repository.
- Dockerfile path: `apps/api/Dockerfile` (the build context stays at the repo
  root because the workspace lockfile lives there).
- Variables:
  - `DATABASE_URL` — reference to the PostgreSQL service.
  - `SESSION_SECRET` — a long random string (32+ characters).
  - `AUTH_USERNAME`, `AUTH_PASSWORD` — your single-user credentials.
  - `NODE_ENV=production`
  - `COOKIE_SECURE=true`, `COOKIE_SAME_SITE=none`
  - `CORS_ORIGINS` — your web URL, only if you call the API cross-origin.
  - `THROTTLE_TTL_SECONDS`, `THROTTLE_LIMIT` — optional rate-limit tuning.
- The container runs `prisma migrate deploy` before starting, so schema changes
  apply on every deploy.
- Health check path: `/api/health`.

### 3. Web service

- Source: the same repository.
- Dockerfile path: `apps/web/Dockerfile`.
- Variables:
  - `API_PROXY_TARGET` — the public API URL, e.g. `https://<api>.up.railway.app`.
    This is read at build time, so redeploy after changing it.
- Health check path: `/login`.

### 4. First-run checklist

1. Open the web URL and sign in with `AUTH_USERNAME` / `AUTH_PASSWORD`.
2. Fill in the candidate profile.
3. Add a job and confirm a match score appears.
4. Change an application status and reload to confirm it persisted.

### Recovery

- **Migrations failed:** check the API deploy logs. `prisma migrate deploy` is
  idempotent and safe to re-run; redeploy the API service.
- **Sessions rejected after a redeploy:** `SESSION_SECRET` changed. Sessions are
  stored in the database, so keeping the secret stable preserves logins.
- **Web shows API errors:** `API_PROXY_TARGET` was wrong when the image was
  built. Fix the variable and redeploy the web service.
- **Data loss risk:** the Railway plugin is the source of truth. Take periodic
  backups with `pg_dump "$DATABASE_URL" > backup.sql`.

## Scope boundaries

Phase 1 deliberately excludes: LinkedIn/Naukri integrations, autonomous
discovery, scheduled scraping, BullMQ/Redis workers, notifications, AI resume or
cover-letter generation, automated applications and native mobile apps.

The schema and module boundaries leave room for these later, but any future job
source must use an official API, a licensed feed or a permitted integration, and
must respect each platform's terms and rate limits. No application is ever
submitted without explicit approval.
