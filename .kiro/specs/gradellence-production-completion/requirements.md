# Requirements — Gradellence SRMS Production Completion

## Overview

Bring the Gradellence SRMS (School Result Management System) to full production readiness. The codebase is approximately 70% complete. This spec covers only what is **missing or broken** — nothing that already works should be re-implemented.

The system is a multi-tenant B2B SaaS platform. Each school is a tenant. The backend is NestJS + PostgreSQL + Prisma. The frontend is React + Vite + TypeScript + Tailwind CSS.

---

## Requirements

### REQ-1 — Fix Subscription Gate in Assessments Service (P1)

**User Story:** As a school admin or teacher, I want to enter assessment scores even if the school has no paid subscription, so that core academic workflows are never blocked by billing state.

**Acceptance Criteria:**

- 1.1 — `AssessmentsService.create()` MUST NOT throw `ForbiddenException('No active subscription found')` when no subscription exists. Schools on trial or with expired subscriptions must still be able to create assessments.
- 1.2 — `AssessmentsService.bulkCreate()` MUST NOT throw `ForbiddenException('No active subscription found')`. The bulk score entry endpoint must work regardless of subscription status.
- 1.3 — The incorrect student-count gate in `create()` and `bulkCreate()` (which checks `currentStudentCount >= subscription.plan.maxStudents` before writing an assessment) MUST be removed. Assessment creation is not a student-creation event and must not be blocked by student limits.
- 1.4 — All existing validation that is unrelated to subscription (e.g. student/subject/term existence, score ≤ maxScore, duplicate check) MUST be preserved.
- 1.5 — After removing the gate, a school with no subscription record must receive a `201 Created` response when a valid assessment is submitted.

---

### REQ-2 — Fix Subscription Gate in Results Service (P1)

**User Story:** As a school admin, I want to compute and publish results regardless of subscription state, so that critical end-of-term workflows are never blocked.

**Acceptance Criteria:**

- 2.1 — `ResultsService.assertWithinStudentLimit()` MUST NOT throw `ForbiddenException('No active subscription found')` when no subscription record exists. This private method must be removed or made a no-op.
- 2.2 — `ResultsService.computeResults()` MUST NOT call the subscription gate. Result computation must proceed for any school with enrolled students and recorded assessments.
- 2.3 — `ResultsService.publishResults()` MUST NOT call the subscription gate. Publishing must succeed for any school with computed results.
- 2.4 — All other validation in these methods (class/term existence, enrolled students, subjects, grade scales) MUST remain intact.
- 2.5 — After the fix, POST `/api/v1/results/compute/:classId/:termId` and POST `/api/v1/results/publish` must return success responses for schools with no subscription record.

---

### REQ-3 — Wire Sentry Error Tracking (P1)

**User Story:** As a platform operator, I want unhandled server errors captured in Sentry so I can monitor production health without checking server logs manually.

**Acceptance Criteria:**

- 3.1 — `server/src/main.ts` MUST call `Sentry.init(...)` as the very first action before `NestFactory.create()`, using `process.env.SENTRY_DSN`, `process.env.NODE_ENV`, and `tracesSampleRate: 1.0`. Sentry must be enabled only when `SENTRY_DSN` is set.
- 3.2 — `HttpExceptionFilter.catch()` MUST call `Sentry.captureException(exception)` for HTTP 5xx errors only (status >= 500). 4xx errors (expected client errors) must NOT be sent to Sentry.
- 3.3 — `SENTRY_DSN` must be added to `docker-compose.yml` as an empty string default in the backend service environment block.
- 3.4 — `SENTRY_DSN` must be documented in `server/.env.example`.
- 3.5 — The `@sentry/node` package is already in `server/package.json` — no new package installation is needed.

---

### REQ-4 — Fix start:prod Script Path (P1)

**User Story:** As a DevOps engineer, I want the production start script to point to the correct compiled output so Docker containers start successfully.

**Acceptance Criteria:**

- 4.1 — `server/package.json` `"start:prod"` script MUST be changed from `"node dist/main"` to `"node dist/src/main"`.
- 4.2 — The Dockerfile `CMD` already uses `["node", "dist/src/main"]` and must remain unchanged.
- 4.3 — Running `npm run start:prod` in the server directory after a build must start the application without a "Cannot find module" error.

---

### REQ-5 — Score Entry Grid Page (P2)

**User Story:** As a teacher, I want a grid interface to enter scores for all students in a class for a given subject and term in a single form, so I don't have to create assessments one student at a time.

**Acceptance Criteria:**

- 5.1 — A new page `client/src/features/assessments/pages/ScoreEntryPage.tsx` MUST exist and be reachable at route `/assessments/score-entry`.
- 5.2 — The page MUST present three required dropdowns at the top: Class, Subject, and Term. The grid MUST NOT render until all three are selected.
- 5.3 — When all three are selected, the page MUST fetch: enrolled students (`GET /api/v1/enrollments/classes/:classId/terms/:termId` or equivalent), and existing scores (`GET /api/v1/assessments?classId=X&subjectId=Y&termId=Z`).
- 5.4 — The grid MUST render one row per enrolled student (showing first name, last name, admission number) and one column per assessment type: CA1 (max 20), CA2 (max 20), EXAM (max 60). Column headers MUST show the type label and max score (e.g. "CA1 /20").
- 5.5 — Each cell MUST be a number input pre-filled with the existing score if one exists. Inputs MUST enforce a minimum of 0 and a maximum equal to that assessment type's max score. Invalid values MUST show a visible error state.
- 5.6 — A "Total" column MUST be calculated client-side in real time as the sum of all entered scores for that student row.
- 5.7 — A "Save All Scores" button at the bottom MUST call `POST /api/v1/assessments/bulk` with all entered scores. The button must show a loading state during submission.
- 5.8 — On successful save, a success toast MUST be displayed using `useToastStore().addToast('success', ...)`.
- 5.9 — On error, an error toast MUST be displayed.
- 5.10 — The page MUST show a `SkeletonTable` while loading enrolled students or existing scores.
- 5.11 — If no students are enrolled in the selected class/term, the page MUST show an `EmptyState` component with an appropriate message.
- 5.12 — A "Score Entry" navigation link MUST be added to `AssessmentsListPage.tsx` as a prominent action button visible in the page header, linking to `/assessments/score-entry`.
- 5.13 — The route `/assessments/score-entry` MUST be registered in `Routes.tsx` inside the authenticated dashboard layout.

---

### REQ-6 — Parent Portal Route Guard (P2)

**User Story:** As a parent, I want to be redirected to the parent login page if I try to access a protected parent portal page without being logged in, so that other users cannot view my children's data.

**Acceptance Criteria:**

- 6.1 — A new component `client/src/features/parents/guards/ParentRoute.tsx` MUST exist. It MUST check for `localStorage.getItem('parent_token')` and render child routes if the token exists, or redirect to `/parent/login` if it does not.
- 6.2 — The following routes in `Routes.tsx` MUST be wrapped with `ParentRoute`: `/parent/dashboard`, `/parent/students/:studentId/results`, `/parent/students/:studentId/analytics`.
- 6.3 — `/parent/login` and `/parent/register` MUST remain public and NOT wrapped by `ParentRoute`.
- 6.4 — The guard MUST NOT perform an API call — it must only check localStorage synchronously.
- 6.5 — When the token is absent and the guard redirects to `/parent/login`, the original path MUST NOT be preserved in state (a simple redirect is sufficient).

---

### REQ-7 — Parent API Token Refresh (P2)

**User Story:** As a parent, I want my session to be silently refreshed when my access token expires so I am not interrupted mid-session with an unexpected logout.

**Acceptance Criteria:**

- 7.1 — `parentAuth.login()` in `client/src/features/parents/services/parentApi.ts` MUST store both the access token (`parent_token`) and the refresh token (`parent_refresh_token`) in localStorage on successful login.
- 7.2 — The `parentApi` axios instance MUST have a response interceptor that catches 401 errors.
- 7.3 — On a 401 error, the interceptor MUST attempt a token refresh by calling `POST /api/v1/parents/refresh` with the stored `parent_refresh_token`.
- 7.4 — If the refresh succeeds, the interceptor MUST update `parent_token` in localStorage and retry the original failed request with the new token.
- 7.5 — If the refresh fails (no stored refresh token, or the refresh call itself returns an error), the interceptor MUST clear both `parent_token` and `parent_refresh_token` from localStorage and redirect the user to `/parent/login`.
- 7.6 — To prevent infinite refresh loops, requests to the `/parents/refresh` endpoint itself MUST NOT be intercepted for retry.

---

### REQ-8 — Student Result View Page (P2)

**User Story:** As a student, I want to view my own results for each term, including subject scores, grades, and a summary, so I can track my academic progress.

**Acceptance Criteria:**

- 8.1 — A new page `client/src/features/results/pages/MyResultsPage.tsx` MUST exist and be reachable at route `/my-results`.
- 8.2 — The page MUST display a term selector dropdown at the top populated from the available terms.
- 8.3 — When a term is selected, the page MUST fetch student results using `GET /api/v1/results/student/:studentId/:termId` where `:studentId` is derived from the currently authenticated user's associated student record.
- 8.4 — Results MUST be displayed in a table or card list showing: subject name, subject code, total score, grade (as a `Badge`), remark, and pass/fail status.
- 8.5 — A summary section MUST display: total number of subjects, average score, GPA, subjects passed, and subjects failed — sourced from the API response `summary` object.
- 8.6 — A "Download Report Card" button MUST be visible when results are published, calling the PDF download endpoint.
- 8.7 — While loading, the page MUST show `SkeletonTable`.
- 8.8 — If no results exist for the selected term, the page MUST show an `EmptyState` component.
- 8.9 — The route `/my-results` MUST be registered in `Routes.tsx` inside the authenticated dashboard layout.

---

### REQ-9 — Harden Super Admin Seed Script (P2)

**User Story:** As a platform operator deploying Gradellence to a new environment, I want the super admin account to be created from environment variables rather than hardcoded credentials, so that I can set the admin email and password without modifying source code.

**Acceptance Criteria:**

- 9.1 — `server/prisma/seed.ts` MUST read the super admin email from `process.env.SUPER_ADMIN_EMAIL`, defaulting to `admin@gradellence.com` if not set.
- 9.2 — The seed script MUST read the super admin password from `process.env.SUPER_ADMIN_PASSWORD`, defaulting to `Admin@Gradellence2026!` if not set.
- 9.3 — The hardcoded values `irismonde.black@gmail.com` and `Laptop-me-llence` MUST be replaced.
- 9.4 — `SUPER_ADMIN_EMAIL` and `SUPER_ADMIN_PASSWORD` MUST be documented in `server/.env.example`.
- 9.5 — If the super admin user already exists, the script MUST skip creation and log a message — this idempotency behavior must be preserved.
- 9.6 — The script MUST log a `CHANGE THIS PASSWORD IMMEDIATELY` warning when creating the user with the default password.

---

### REQ-10 — Database Backup Service (P2)

**User Story:** As a platform operator, I want automated daily database backups so that I can recover from data loss or accidental deletion.

**Acceptance Criteria:**

- 10.1 — `docker-compose.yml` MUST include a `pg-backup` service using `prodrigestivus/pg-backup:latest` that runs a `@daily` backup schedule writing to `./backups`.
- 10.2 — The backup service MUST depend on the `postgres` service with `condition: service_healthy`.
- 10.3 — The backup service MUST use `${POSTGRES_PASSWORD}` (not a hardcoded password) to connect to PostgreSQL.
- 10.4 — `./backups` MUST be added to `.gitignore`.
- 10.5 — A new file `docs/BACKUP_RESTORE.md` MUST document the backup schedule, backup file location, and restore procedure using `pg_restore` or `psql`.

---

### REQ-11 — Security Hardening: Env Vars and Secrets (P3)

**User Story:** As a security-conscious operator, I want all secrets moved out of committed files into environment variables, so that credentials are never exposed in version control.

**Acceptance Criteria:**

- 11.1 — `docker-compose.yml` MUST replace all hardcoded secret values with `${VAR}` references. Specifically: `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_PASS` MUST NOT appear as plaintext values.
- 11.2 — `server/.env.example` MUST be created (or updated) to document all required environment variables with placeholder values. It MUST include: `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SENTRY_DSN`, `FRONTEND_URL`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `POSTGRES_PASSWORD`, `NODE_ENV`, `PORT`.
- 11.3 — `.gitignore` MUST include `backups/` and `server/.env`. The broken line `//prisma/migrations/` MUST be fixed to `prisma/migrations/`.
- 11.4 — The string `"your-access-secret-key-change-in-production"` and any similar placeholder JWT secrets MUST NOT appear in any committed file (only in .env.example as a placeholder comment or empty value).

---

### REQ-12 — Production Nginx Configuration (P3)

**User Story:** As a DevOps engineer, I want a production-ready Nginx configuration with HTTPS, security headers, and rate limiting so I can deploy Gradellence with a single command.

**Acceptance Criteria:**

- 12.1 — A new file `docker/nginx/nginx.prod.conf` MUST exist with: HTTP → HTTPS redirect (301), SSL termination using Let's Encrypt certificate paths (`/etc/letsencrypt/live/{DOMAIN}/`), gzip compression enabled, security headers (`X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Strict-Transport-Security` with 1-year `max-age`, basic `Content-Security-Policy`), rate limiting zone for `/api/v1/auth/` routes (e.g. 10r/m per IP), proxy to backend with correct headers (`X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`), and static file serving for the frontend build with `Cache-Control: public, max-age=31536000, immutable` for hashed assets.
- 12.2 — A new file `docker-compose.prod.yml` MUST exist that extends the base `docker-compose.yml` behavior with: the production Nginx service using the `nginx.prod.conf`, SSL certificate volume mounts, `NODE_ENV: production` override for the backend, and `restart: always` for all services.
- 12.3 — `docs/DEPLOYMENT.md` MUST be updated to include: certbot SSL certificate issuance command, how to use `docker-compose.prod.yml`, and how to renew certificates.

---

### REQ-13 — Wire Global Toast to Axios Interceptor (P3)

**User Story:** As a user, I want to see consistent success and error notifications after every data mutation (create, update, delete) so I always know whether my action succeeded.

**Acceptance Criteria:**

- 13.1 — The main authenticated `apiClient.ts` MUST have a response interceptor that calls `useToastStore.getState().addToast('error', message)` for all failed requests (non-2xx responses).
- 13.2 — The error message shown in the toast MUST be extracted from `error.response?.data?.error?.message` or `error.response?.data?.message`, falling back to `'An unexpected error occurred'`.
- 13.3 — 401 Unauthorized responses MUST NOT show an error toast — these are handled by the auth redirect flow.
- 13.4 — The interceptor MUST NOT duplicate error handling already present on individual pages (the page-level error state is separate from the toast — both can coexist).
- 13.5 — `parentApi.ts` error interceptor behavior (from REQ-7) is separate and must not be merged with the main apiClient interceptor.

---

## Out of Scope

The following items were mentioned in the original brief but are either already implemented or explicitly deferred:

- **Auth flows (login, register, forgot/reset password)** — already fully implemented, no changes needed.
- **Email processor (nodemailer)** — already wired with all templates, no changes needed.
- **Dockerfile production stage** — already correct (`node dist/src/main`), only the package.json script needs fixing (REQ-4).
- **Password reset DB model** — not needed; password reset uses Redis (already working).
- **AssessmentConfig schema model** — not adding to schema; score entry grid (REQ-5) uses hardcoded CA1/CA2/EXAM types.
- **BroadsheetPage compute/publish UI** — already fully implemented.
- **ClassesListPage teacher display bug** — already fixed (uses ternary with `'—'` fallback).
- **Student count in class list** — already implemented (`_count.enrollments` already in `findAll()`).
- **Parent portal analytics chart** — already implemented with recharts `LineChart` in `StudentAnalyticsPage.tsx`.
- **Super admin portal** — already fully implemented; only the seed script needs hardening (REQ-9).
- **Student promotion endpoint** — deferred (not blocking production).
- **AI features** — out of scope for this completion sprint.
- **Payment gateway (Paystack/Stripe)** — out of scope for this completion sprint.
- **Report card PDF generation** — backend already has `PdfService`; frontend download is wired in `ResultsListPage`. Not in scope to rebuild.
