# Autonomous Job Hunter

A from-scratch monorepo foundation for discovering, evaluating and tracking software engineering vacancies.

## Initial scope

- NestJS API with candidate profile and job endpoints.
- Explainable job-fit scoring (skills, title, location, salary and experience).
- PostgreSQL persistence through Prisma.
- Next.js dashboard shell.
- Local PostgreSQL via Docker Compose.
- Designed so discovery connectors, scheduled workers and notifications can be added in later phases.

**Important:** this starter does not scrape LinkedIn, Naukri or other portals. Add official APIs, permitted feeds, partner integrations or user-provided job URLs. Respect each platform's terms, rate limits and robots/access rules. No automatic applications are submitted.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker Desktop or Docker Engine

## Run locally

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

- API: http://localhost:4000/api
- API health: http://localhost:4000/api/health
- Web: http://localhost:3000

The first migration can be created with:

```bash
pnpm --filter api exec prisma migrate dev --name init
```

## Seed your candidate profile

Use the API:

```bash
curl -X PUT http://localhost:4000/api/candidate/profile \
  -H 'Content-Type: application/json' \
  -d '{
    "headline":"Senior Full Stack / MERN Developer",
    "yearsExperience":4,
    "targetMinLpa":18,
    "targetMaxLpa":25,
    "preferredLocations":["Delhi NCR","Bengaluru","Pune"],
    "remoteOpen":true,
    "skills":["React","Next.js","TypeScript","Node.js","NestJS","Express","MongoDB","PostgreSQL","Redis","GraphQL"]
  }'
```

## Add a job

```bash
curl -X POST http://localhost:4000/api/jobs \
  -H 'Content-Type: application/json' \
  -d '{
    "title":"Senior Full Stack Engineer",
    "company":"Example Technologies",
    "location":"Delhi NCR",
    "workMode":"HYBRID",
    "description":"Build products using React, TypeScript, Node.js and PostgreSQL.",
    "skills":["React","TypeScript","Node.js","PostgreSQL"],
    "minLpa":18,
    "maxLpa":24,
    "source":"MANUAL",
    "sourceUrl":"https://example.com/careers/job"
  }'
```

Then request matches:

```bash
curl http://localhost:4000/api/jobs/matches
```

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/candidate/profile` | Read candidate profile |
| PUT | `/api/candidate/profile` | Create/update candidate profile |
| POST | `/api/jobs` | Add a job |
| GET | `/api/jobs` | List jobs |
| GET | `/api/jobs/matches` | Score and list matching jobs |
| PATCH | `/api/jobs/:id/status` | Update application status |

## Scoring model

The initial deterministic score is explainable and intentionally simple:
- Skills overlap: 40 points
- Role/title relevance: 20 points
- Location/work-mode fit: 15 points
- Salary fit: 15 points
- Experience fit: 10 points

The API returns both the total and a breakdown. Tune weights after reviewing real matches; do not treat a score as a hiring probability.

## Railway deployment

1. Create a Railway project and add a PostgreSQL service.
2. Deploy `apps/api` as a service with root directory `/apps/api` (or use the included Dockerfile from repository root with the API Dockerfile path).
3. Set `DATABASE_URL` from the Railway PostgreSQL reference variable.
4. Set `PORT` if required by Railway; the API listens on `PORT` or `API_PORT`.
5. Deploy `apps/web` separately and set `NEXT_PUBLIC_API_URL` to the public API URL.
6. Run Prisma migrations as a release/deploy step before serving traffic.

Keep secrets in Railway variables, never commit `.env`.
