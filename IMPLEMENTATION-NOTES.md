# Implementation notes and next steps

## Phase 1 acceptance checklist

- [ ] Install dependencies successfully.
- [ ] Start PostgreSQL and apply Prisma migration.
- [ ] Save candidate profile.
- [ ] Add representative job records from permitted sources/manual URLs.
- [ ] Verify match scores and breakdowns.
- [ ] Verify application status updates.
- [ ] Deploy API and web as separate Railway services.

## Engineering follow-ups before production

- Add authentication and per-user data isolation before exposing the app publicly.
- Add request rate limiting, structured logging, validation for URL safety, and centralized exception handling.
- Add pagination and filtering to job listing.
- Add tests for scoring edge cases and API routes.
- Replace permissive CORS with an explicit web origin.
- Do not store raw resumes until retention, access controls and deletion behavior are implemented.
- Do not scrape sites that prohibit automated access. Prefer official APIs, licensed feeds, email alerts parsed with user consent, and direct company career pages that permit access.
