# Implementation Plan: Gradellence SRMS Production Completion

## Overview

The codebase is approximately 70% complete. This plan covers only the missing or broken pieces identified by auditing the existing source files against the requirements. Tasks are ordered from quick, high-impact backend fixes (P1) through new frontend pages (P2) to infrastructure hardening (P3). REQ-13 is already implemented and is excluded.

---

## Tasks

- [x] 1. Remove subscription gates from AssessmentsService (REQ-1)
  - [x] 1.1 Delete the subscription check block from `AssessmentsService.create()`
    - In `server/src/modules/assessments/assessments.service.ts`, remove the `prisma.schoolSubscription.findFirst` call, the `if (!subscription)` ForbiddenException throw, the `currentStudentCount` count query, and the `currentStudentCount >= subscription.plan.maxStudents` ForbiddenException throw — all in `create()`. Preserve every other validation below those blocks (student/subject/term existence, score ≤ maxScore, duplicate check).
    - _Requirements: 1.1, 1.3, 1.4, 1.5_
  - [x] 1.2 Delete the subscription check block from `AssessmentsService.bulkCreate()`
    - Same removal pattern as 1.1 but inside `bulkCreate()`: remove the `schoolSubscription.findFirst`, the `if (!subscription)` throw, the `student.count` query, the unique-student-ID calculation, and the `currentStudentCount + uniqueStudentIds.length > subscription.plan.maxStudents` throw. Preserve all logic from the `subject` lookup onwards.
    - _Requirements: 1.2, 1.3, 1.4, 1.5_

- [x] 2. Remove subscription gate from ResultsService (REQ-2)
  - [x] 2.1 Remove `assertWithinStudentLimit()` and its call sites in `results.service.ts`
    - Delete the entire private `assertWithinStudentLimit(schoolId)` method from `server/src/modules/results/results.service.ts`. Remove the `await this.assertWithinStudentLimit(currentUser.schoolId)` call at the top of `computeResults()` and the identical call at the top of `publishResults()`. No other changes to either method — all class/term/enrollment validation must remain intact.
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Wire Sentry error tracking (REQ-3)
  - [x] 3.1 Add `Sentry.init()` to `main.ts`
    - In `server/src/main.ts`, add `import * as Sentry from '@sentry/node';` as the very first import. Immediately after that import (before the `bootstrap` function), add the `Sentry.init({ dsn: process.env.SENTRY_DSN || '', environment: process.env.NODE_ENV || 'development', tracesSampleRate: 1.0, enabled: !!process.env.SENTRY_DSN })` call. Do not change anything inside `bootstrap()`.
    - _Requirements: 3.1, 3.5_
  - [x] 3.2 Capture 5xx exceptions in `HttpExceptionFilter`
    - In `server/src/common/filters/http-exception.filter.ts`, add `import * as Sentry from '@sentry/node';`. In the `catch()` method, in the `else` branch (where `status` is set to `HttpStatus.INTERNAL_SERVER_ERROR`), add `Sentry.captureException(exception);` before the `this.logger.error(exception)` line. Do not call `captureException` for the `HttpException` branch (4xx errors).
    - _Requirements: 3.2_

- [x] 4. Fix `start:prod` script path (REQ-4)
  - [x] 4.1 Update `start:prod` in `server/package.json`
    - Change `"start:prod": "node dist/main"` to `"start:prod": "node dist/src/main"`. No other changes to the file.
    - _Requirements: 4.1, 4.3_

- [x] 5. Harden super admin seed script (REQ-9)
  - [x] 5.1 Replace hardcoded credentials with env var reads in `seed.ts`
    - In `server/prisma/seed.ts`, replace the hardcoded string `'irismonde.black@gmail.com'` with `process.env.SUPER_ADMIN_EMAIL ?? 'admin@gradellence.com'` and `'Laptop-me-llence'` with `process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@Gradellence2026!'`. Update the `firstName`/`lastName` in the `prisma.user.create` call to match the new default (e.g. `firstName: 'Super', lastName: 'Admin'`). Add a `console.warn('⚠ Using default SUPER_ADMIN_PASSWORD — CHANGE THIS IMMEDIATELY in production')` log guarded by `if (!process.env.SUPER_ADMIN_PASSWORD)` before the `bcrypt.hash` call. Preserve the idempotency check (`findUnique` before create) and all subscription plan / permission seeding logic.
    - _Requirements: 9.1, 9.2, 9.3, 9.5, 9.6_

- [x] 6. Create `server/.env.example` (REQ-9, REQ-11)
  - [x] 6.1 Create `server/.env.example` with all environment variables documented
    - Create the file `server/.env.example`. It must include documented placeholder entries for: `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_DB`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_EXPIRATION`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SENTRY_DSN`, `FRONTEND_URL`, `SUPER_ADMIN_EMAIL`, `SUPER_ADMIN_PASSWORD`, `POSTGRES_PASSWORD`. Use empty or clearly fake placeholder values (e.g. `JWT_ACCESS_SECRET=change-me-in-production`). Add inline comments describing each variable.
    - _Requirements: 3.4, 9.4, 11.2_

- [x] 7. Checkpoint — Backend fixes complete
  - Ensure the backend builds without errors (`npm run build` in `server/`). Verify the `start:prod` path resolves after a build. Ask the user if questions arise.

- [x] 8. Parent token refresh — backend (REQ-7)
  - [x] 8.1 Add parent refresh token key and TTL to `redis.constants.ts`
    - In `server/src/common/redis/redis.constants.ts`, add a `PARENT_REFRESH_TOKEN` key function: `PARENT_REFRESH_TOKEN: (parentId: string) => \`\${REDIS_KEY_PREFIX}:auth:parent:refresh:\${parentId}\`` inside `REDIS_KEYS`. The `REDIS_TTL` object already has `REFRESH_TOKEN: 7 * 24 * 60 * 60` — reuse the same TTL constant.
    - _Requirements: 7.3_
  - [x] 8.2 Inject `RedisService` into `ParentsModule` and update `parents.service.ts`
    - In `server/src/modules/parents/parents.module.ts`, import `RedisModule` from `../../common/redis/redis.module` and add it to the `imports` array. In `parents.service.ts`, inject `private readonly redisService: RedisService` in the constructor (import from `../../common/redis/redis.service`). In the `login()` method, after generating tokens, add `await this.redisService.set(REDIS_KEYS.PARENT_REFRESH_TOKEN(parent.id), tokens.refreshToken, REDIS_TTL.REFRESH_TOKEN)` (import `REDIS_KEYS` and `REDIS_TTL` from `../../common/redis/redis.constants`). Add a new `async refreshToken(token: string)` method that: (1) reads all stored parent refresh tokens using a generic `get` scan strategy — since tokens are keyed by parentId, decode the parentId from the raw token by scanning via `this.redisService.get` is not feasible; instead, store the mapping in reverse: also store `PARENT_REFRESH_TOKEN_REVERSE: (token) => \`srms:auth:parent:refresh:rev:\${token}\`` → parentId. On login, store both directions. In `refreshToken(token)`: get parentId from the reverse key, verify against stored token, generate new tokens, rotate both keys, return new accessToken. On failure, throw `UnauthorizedException`.
    - _Requirements: 7.3, 7.4, 7.5_
  - [x] 8.3 Add `POST /parents/refresh` endpoint to `parents.controller.ts`
    - In `server/src/modules/parents/parents.controller.ts`, add a new `@Post('refresh')` `@HttpCode(HttpStatus.OK)` endpoint that accepts `@Body() body: { refreshToken: string }` and calls `this.parentsService.refreshToken(body.refreshToken)`. No auth guard on this endpoint (it is the unauthenticated refresh route). Return `{ accessToken, refreshToken }`.
    - _Requirements: 7.3_

- [x] 9. Parent token refresh — frontend (REQ-7)
  - [x] 9.1 Update `parentApi.ts` to store refresh token on login and add 401 interceptor
    - In `client/src/features/parents/services/parentApi.ts`: (1) In `parentAuth.login()`, after the API call succeeds, store both `parent_token` (accessToken) and `parent_refresh_token` (refreshToken) to `localStorage` before returning. (2) Add a response interceptor to the `parentApi` axios instance that on 401 errors: reads `localStorage.getItem('parent_refresh_token')`, skips retry if the original request URL includes `/parents/refresh` (to prevent infinite loops), calls `POST /parents/refresh` with `{ refreshToken }`, on success stores the new `parent_token` and `parent_refresh_token` in localStorage and retries the original request with the new token in the Authorization header, on failure removes both `parent_token` and `parent_refresh_token` from localStorage and calls `window.location.href = '/parent/login'`.
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 10. Create `ParentRoute` guard (REQ-6)
  - [x] 10.1 Create `client/src/features/parents/guards/ParentRoute.tsx`
    - Create the directory `client/src/features/parents/guards/` and the file `ParentRoute.tsx`. Implement a default-export component that reads `localStorage.getItem('parent_token')` synchronously. If the token exists, return `<Outlet />`. If it does not, return `<Navigate to="/parent/login" replace />`. Import `Navigate` and `Outlet` from `react-router-dom`. No API calls. No state. This mirrors the existing `SuperAdminGuard` pattern.
    - _Requirements: 6.1, 6.4, 6.5_
  - [x] 10.2 Wrap parent portal routes in `Routes.tsx` with `ParentRoute`
    - In `client/src/routes/Routes.tsx`, import `ParentRoute` from `../features/parents/guards/ParentRoute`. Replace the three unguarded parent route declarations (`/parent/dashboard`, `/parent/students/:studentId/results`, `/parent/students/:studentId/analytics`) with a `<Route element={<ParentRoute />}>` wrapper containing those three routes as children. Leave `/parent/login` and `/parent/register` unchanged as public routes.
    - _Requirements: 6.2, 6.3_

- [x] 11. Create `ScoreEntryPage` (REQ-5)
  - [x] 11.1 Create `client/src/features/assessments/pages/ScoreEntryPage.tsx`
    - Create the file. The page must have three `<Select>` dropdowns (Class, Subject, Term) at the top inside a `<FormSection>`. Fetch options on mount from `/v1/classes?page=1&limit=100`, `/v1/subjects?page=1&limit=100`, and `/v1/sessions?page=1&limit=100` (flatten sessions → terms). The score grid renders only when all three are selected. On selection of all three, fetch in parallel: enrolled students from `GET /v1/enrollments/classes/:classId/terms/:termId` and existing scores from `GET /v1/assessments?subjectId=Y&termId=Z&page=1&limit=200` (filter client-side by enrolled student IDs). Show `<SkeletonTable>` while loading. Show `<EmptyState>` if no enrolled students. The grid is a `<table>` with columns: Student (first name, last name, admission number), CA1 /20, CA2 /20, EXAM /60, Total. Use the hardcoded assessment type config `[{ type: 'CA1', maxScore: 20 }, { type: 'CA2', maxScore: 20 }, { type: 'EXAM', maxScore: 60 }]`. Each score cell is a number `<input>` with `min=0` `max={maxScore}`, pre-filled from existing assessments, showing a red border on invalid values. Total is computed client-side in real time as the sum of all three scores for each row. Component state shape: `Record<studentId, Record<type, { value: string; assessmentId?: string; isDirty: boolean }>>`. A "Save All Scores" `<Button variant="primary" loading={isSaving}>` at the bottom: for cells with no `assessmentId`, batch via `POST /v1/assessments/bulk`; for cells with an `assessmentId` and `isDirty`, call `PUT /v1/assessments/:id` per changed cell. On success, call `useToastStore().addToast('success', 'Scores saved successfully')`. On error, call `useToastStore().addToast('error', message)`. Use `<PageHeader>` from `@/components/ui` with title "Score Entry". Follow all design system rules (no spinners, use Button loading prop, Tailwind classes).
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11_
  - [x] 11.2 Add "Score Entry" button to `AssessmentsListPage.tsx`
    - In `client/src/features/assessments/pages/AssessmentsListPage.tsx`, import `Grid3x3` (or `LayoutGrid`) from `lucide-react`. In the `PageHeader` `actions` prop, add a `<Button variant="secondary" size="sm" onClick={() => navigate('/assessments/score-entry')}>` with the icon and label "Score Entry" — place it between the "Import Scores" and "New Assessment" buttons.
    - _Requirements: 5.12_
  - [x] 11.3 Register `/assessments/score-entry` route in `Routes.tsx`
    - In `client/src/routes/Routes.tsx`, import `ScoreEntryPage` from `../features/assessments/pages/ScoreEntryPage`. Add `{ path: 'assessments/score-entry', element: <ScoreEntryPage /> }` to the `routes` array so it is automatically included inside the authenticated `DashboardLayout` wrapper.
    - _Requirements: 5.13_

- [x] 12. Create `MyResultsPage` (REQ-8)
  - [x] 12.1 Create `client/src/features/results/pages/MyResultsPage.tsx`
    - Create the file. On mount, fetch all sessions from `GET /v1/sessions?page=1&limit=100`, flatten to a list of terms for a `<Select>` dropdown at the top. Also fetch the current user's student record from `GET /v1/students?page=1&limit=1` — the authenticated user's student will be returned since the API filters by `schoolId` from the JWT. If no student record is found, show `<EmptyState>` with message "No student record linked to your account". When a term is selected, fetch `GET /v1/results/student/:studentId/:termId`. Show `<SkeletonTable>` while loading. Show `<EmptyState>` if no results. Results table columns: Subject, Score, Grade (`<Badge>` variant mapped via grade letter), Remark, Pass/Fail (`<Badge variant="success">` / `<Badge variant="danger">`). Below the table, render a row of KPI cards (use `<KpiCard>` from `@/components/ui`) showing: Total Subjects, Average Score, GPA, Passed, Failed — from `response.data.summary`. Show a `<Button variant="secondary">Download Report Card</Button>` button when `isPublished` results exist; on click call `GET /v1/results/report-card/:studentId/:termId` with `responseType: 'blob'` and trigger a file download. Use `<PageHeader>` with title "My Results". Follow design system rules.
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8_
  - [x] 12.2 Register `/my-results` route in `Routes.tsx`
    - In `client/src/routes/Routes.tsx`, import `MyResultsPage` from `../features/results/pages/MyResultsPage`. Add `{ path: 'my-results', element: <MyResultsPage /> }` to the `routes` array.
    - _Requirements: 8.9_

- [x] 13. Checkpoint — Frontend features complete
  - Ensure TypeScript compiles without errors (`npx tsc --noEmit` in `client/`). Confirm all new routes are reachable in the browser. Ask the user if questions arise.

- [x] 14. Security hardening — `docker-compose.yml` and `.gitignore` (REQ-10, REQ-11)
  - [x] 14.1 Move hardcoded secrets to env vars and add pg-backup in `docker-compose.yml`
    - In `docker-compose.yml`: (1) Replace `POSTGRES_PASSWORD: adminroot` with `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}` in the `postgres` service. (2) Replace `DATABASE_URL: postgresql://postgres:adminroot@postgres:5432/srms?schema=public` with `DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/srms?schema=public` in the `backend` service. (3) Replace `JWT_ACCESS_SECRET: your-access-secret-key-change-in-production` with `JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}`. (4) Replace `JWT_REFRESH_SECRET: your-refresh-secret-key-change-in-production` with `JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}`. (5) Replace `SMTP_PASS: qpufeglgmmbanwzm` with `SMTP_PASS: ${SMTP_PASS}`. (6) Add `SENTRY_DSN: ${SENTRY_DSN:-}` to the backend environment block. (7) Add the `pg-backup` service as specified in DD-8: `image: prodrigestivus/pg-backup:latest`, `container_name: srms-pg-backup`, `restart: unless-stopped`, environment block with `SCHEDULE: '@daily'`, `BACKUP_DIR: /backups`, `POSTGRES_HOST: postgres`, `POSTGRES_DB: srms`, `POSTGRES_USER: postgres`, `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`, volume `./backups:/backups`, `depends_on: postgres: condition: service_healthy`.
    - _Requirements: 10.1, 10.2, 10.3, 11.1, 3.3_
  - [x] 14.2 Fix `.gitignore`
    - In `.gitignore`: (1) Add `backups/` on its own line. (2) Replace the broken line `//prisma/migrations/` with `prisma/migrations/`. (3) Add `server/.env` if not already present (it is already covered by the existing `.env` line — verify and add `server/.env` explicitly for clarity).
    - _Requirements: 10.4, 11.3_

- [x] 15. Create `docs/BACKUP_RESTORE.md` (REQ-10)
  - [x] 15.1 Create `docs/BACKUP_RESTORE.md`
    - Create the file documenting: (1) backup schedule (`@daily` via pg-backup container), (2) backup file location (`./backups/` on the host), (3) file naming convention from the `prodrigestivus/pg-backup` image, (4) restore procedure using `psql -U postgres -d srms < backup-file.sql` or `pg_restore` for custom format, (5) how to run a manual backup by exec-ing into the container. Keep it concise — this is operational documentation, not a tutorial.
    - _Requirements: 10.5_

- [x] 16. Create production Nginx config and `docker-compose.prod.yml` (REQ-12)
  - [x] 16.1 Create `docker/nginx/nginx.prod.conf`
    - Create the directory `docker/nginx/` and the file `nginx.prod.conf`. The config must include: (1) `limit_req_zone $binary_remote_addr zone=auth_limit:10m rate=10r/m;` at the top level. (2) An HTTP server block on port 80 that returns a 301 redirect to `https://$host$request_uri`. (3) An HTTPS server block on port 443 with: `ssl_certificate /etc/letsencrypt/live/${DOMAIN}/fullchain.pem;`, `ssl_certificate_key /etc/letsencrypt/live/${DOMAIN}/privkey.pem;`, `gzip on;` with `gzip_types text/plain text/css application/json application/javascript text/xml application/xml;`, security headers (`X-Frame-Options SAMEORIGIN`, `X-Content-Type-Options nosniff`, `Strict-Transport-Security "max-age=31536000; includeSubDomains"`, `Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;"`), `location /api/v1/auth/ { limit_req zone=auth_limit burst=5 nodelay; proxy_pass http://backend:3000; proxy_set_header X-Real-IP $remote_addr; proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; proxy_set_header X-Forwarded-Proto $scheme; }`, `location /api/ { proxy_pass http://backend:3000; proxy_set_header X-Real-IP $remote_addr; ... }`, `location / { root /usr/share/nginx/html; index index.html; try_files $uri $uri/ /index.html; location ~* \.(js|css|png|jpg|ico|woff2)$ { add_header Cache-Control "public, max-age=31536000, immutable"; } }`.
    - _Requirements: 12.1_
  - [x] 16.2 Create `docker-compose.prod.yml`
    - Create `docker-compose.prod.yml` at the repo root. It must define service overrides for production: (1) `backend` service with `environment: NODE_ENV: production`. (2) An `nginx` service using the `nginx:alpine` image, mounting `./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf:ro` and the Let's Encrypt certificates volume `/etc/letsencrypt:/etc/letsencrypt:ro`, exposing ports 80 and 443, `restart: always`, `depends_on: backend`. (3) All services with `restart: always`. Use `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d` as the deployment command (document this in DEPLOYMENT.md).
    - _Requirements: 12.2_
  - [x] 16.3 Update `docs/DEPLOYMENT.md` with SSL and production instructions
    - Update the existing `docs/deployment.md` file to add a "Production Deployment" section covering: (1) certbot SSL certificate issuance: `certbot certonly --standalone -d yourdomain.com`, (2) how to deploy using `docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`, (3) certificate renewal: `certbot renew --pre-hook "docker-compose stop nginx" --post-hook "docker-compose start nginx"`, (4) reminder to create a `.env` file from `server/.env.example` before deploying.
    - _Requirements: 12.3_

- [x] 17. Final checkpoint — Full production readiness
  - Ensure `docker-compose config` validates without errors. Confirm `.gitignore` correctly ignores `backups/`. Ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP (none in this plan — all tasks are required fixes, not new features or tests)
- REQ-13 (Wire Global Toast to Axios Interceptor) is **already implemented** in `client/src/services/apiClient.ts` and has no tasks
- The design has no Correctness Properties requiring property-based tests that are feasible in a coding-agent context; all P-properties in the design doc are integration-level and are validated by the implementations themselves
- Tasks 1–7 are all pure backend file edits — no schema changes, no new dependencies
- Task 8 (parent refresh) requires wiring `RedisModule` into `ParentsModule`; `RedisModule` is already `@Global()` but must still be listed in the `imports` array of `ParentsModule` to satisfy NestJS DI resolution
- The `PARENT_REFRESH_TOKEN` reverse-key approach in task 8.2 is the simplest Redis pattern that avoids a full key scan; store `token → parentId` at login alongside `parentId → token`
- For `ScoreEntryPage` (task 11.1), the `PUT /v1/assessments/:id` loop for updated scores is sequential — do not parallelize to avoid rate-limit issues on large classes

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "2.1", "3.1", "3.2", "4.1", "5.1"] },
    { "id": 1, "tasks": ["6.1", "8.1"] },
    { "id": 2, "tasks": ["8.2"] },
    { "id": 3, "tasks": ["8.3", "9.1"] },
    { "id": 4, "tasks": ["10.1", "10.2"] },
    { "id": 5, "tasks": ["11.1", "12.1"] },
    { "id": 6, "tasks": ["11.2", "11.3", "12.2"] },
    { "id": 7, "tasks": ["14.1", "14.2"] },
    { "id": 8, "tasks": ["15.1"] },
    { "id": 9, "tasks": ["16.1", "16.2"] },
    { "id": 10, "tasks": ["16.3"] }
  ]
}
```
