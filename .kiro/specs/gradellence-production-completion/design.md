# Design — Gradellence SRMS Production Completion

## Overview

This document describes the technical design for each requirement in the production completion spec. It covers only what needs to change — the existing working code is the source of truth and must not be re-implemented.

---

## Design Decisions

### DD-1: Subscription Gate Removal Strategy

**Problem:** `assessmentsService.create()`, `assessmentsService.bulkCreate()`, and `ResultsService.assertWithinStudentLimit()` all call `prisma.schoolSubscription.findFirst({ where: { status: 'ACTIVE' } })` and throw `ForbiddenException` when no subscription is found.

**Decision:** Delete the subscription check blocks entirely from these three methods. The `enforceEntityLimit()` helper in `trial-limits.helper.ts` already handles subscription-aware entity limits correctly for students, teachers, classes, and subjects. Assessments and result computation are operational actions on existing data — they are not entity creation events and must never be gated by billing.

**Impact:** Zero schema changes. Two method edits in `assessments.service.ts`, one private method removal in `results.service.ts`.

---

### DD-2: Sentry Initialization Pattern

**Problem:** `@sentry/node` is in `package.json` but never called. The `HttpExceptionFilter` logs 5xx errors to console only.

**Decision:** Add `Sentry.init(...)` as the first statement in `main.ts` (before any NestJS bootstrapping). In `HttpExceptionFilter`, add `Sentry.captureException(exception)` in the `else` branch (non-HttpException = 5xx) only. 4xx `HttpException`s are expected client errors and must not pollute Sentry.

**Pattern:**
```ts
// main.ts — top of file, before any imports of app code
import * as Sentry from '@sentry/node';
Sentry.init({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: 1.0,
  enabled: !!process.env.SENTRY_DSN,
});
```

---

### DD-3: Score Entry Grid Architecture

**Problem:** Teachers need to enter CA1, CA2, and EXAM scores for all students in a class in a single operation. The existing `AssessmentFormPage` is a single-record form. No `AssessmentConfig` model exists in the schema.

**Decision:** Use hardcoded assessment type config `[{ type: 'CA1', maxScore: 20 }, { type: 'CA2', maxScore: 20 }, { type: 'EXAM', maxScore: 60 }]` in the frontend component. This avoids a schema migration and matches the assessment data already in the database.

**Data flow:**
1. User selects Class → Subject → Term via three `<Select>` dropdowns
2. On all three selected: parallel fetch of `GET /api/v1/enrollments/classes/:classId/terms/:termId` (enrolled students) and `GET /api/v1/assessments?classId=X&subjectId=Y&termId=Z` (wait — the assessments endpoint does not accept `classId` as a filter, but it accepts `studentId`. Instead, use `GET /api/v1/assessments?subjectId=Y&termId=Z` and filter client-side by enrolled student IDs).
3. Render grid: rows = enrolled students, columns = [CA1, CA2, EXAM, Total]
4. Populate each cell from existing assessments keyed on `{ studentId, type }`
5. On "Save All Scores": collect all non-empty cells → build `BulkAssessmentDto` payload → `POST /api/v1/assessments/bulk`
6. The bulk endpoint already handles upsert-like behavior (skips duplicates). To handle score updates, the save logic must check if an existing assessment already exists for that student+type+subject+term, and if so call `PUT /api/v1/assessments/:id` instead. For new scores, include them in the bulk POST payload.

**Simplified save strategy:** Since the bulk endpoint skips existing records rather than updating them, use a two-pass approach:
- New scores (no existing assessment for that student+type): batch via `POST /api/v1/assessments/bulk`
- Updated scores (existing assessment found): call `PUT /api/v1/assessments/:id` for each changed value

**Component state shape:**
```ts
type ScoreCell = { value: string; assessmentId?: string; isDirty: boolean };
type ScoreGrid = Record<string, Record<string, ScoreCell>>; // [studentId][type]
```

---

### DD-4: Parent Route Guard

**Problem:** All parent portal routes are publicly accessible without any authentication check at the route level. `ParentDashboard` has an inline `if (!token) navigate(...)` but this runs after render.

**Decision:** Create a React component `ParentRoute` that wraps `<Outlet />` and performs a synchronous localStorage check. Use `<Navigate>` for the redirect. This is the same pattern as the `SuperAdminGuard` already in the codebase.

**Implementation:**
```tsx
// client/src/features/parents/guards/ParentRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
export default function ParentRoute() {
  const token = localStorage.getItem('parent_token');
  return token ? <Outlet /> : <Navigate to="/parent/login" replace />;
}
```

**Route wrapping in Routes.tsx:**
```tsx
<Route element={<ParentRoute />}>
  <Route path="/parent/dashboard" element={<ParentDashboard />} />
  <Route path="/parent/students/:studentId/results" element={<StudentResultsPage />} />
  <Route path="/parent/students/:studentId/analytics" element={<StudentAnalyticsPage />} />
</Route>
```

---

### DD-5: Parent Token Refresh

**Problem:** `parentAuth.login()` stores only the access token. On 401 the parentApi axios instance has no retry logic.

**Decision:** 
- On login: store both `parent_token` (accessToken) and `parent_refresh_token` (refreshToken) in localStorage.
- Add a response interceptor to `parentApi` that on 401: reads `parent_refresh_token`, calls `POST /api/v1/parents/refresh` with the token, updates localStorage on success, retries the original request. On refresh failure: clears both tokens and redirects to `/parent/login`.
- The `parents.service.ts` `login()` method already returns `refreshToken` from `generateTokens()` — no backend change needed.
- The refresh endpoint must exist: check `parents.controller.ts` for a `POST /parents/refresh` endpoint.

**Note:** The `ParentsService.generateTokens()` creates a UUID refresh token but does NOT persist it to the database (no `RefreshToken` model for parents). This means the refresh endpoint cannot validate it. **Backend fix required:** Add a `parentRefreshTokens` map in Redis (or store in DB) to validate parent refresh tokens. The simplest approach: store the parent refresh token in Redis with a 7-day TTL using `REDIS_KEYS.REFRESH_TOKEN('parent:' + parentId)`, and add a `POST /parents/refresh` endpoint.

---

### DD-6: Student Result View (MyResultsPage)

**Problem:** No student-facing result view exists.

**Decision:** Create `MyResultsPage.tsx` that:
1. On mount, fetches all terms (`GET /api/v1/sessions`) to populate the term selector.
2. Reads the current user's student ID from `useAuthStore()` — the authenticated user's `student` relation gives the studentId. If no studentId is associated with the user, show an `EmptyState` with a message.
3. When a term is selected, fetches `GET /api/v1/results/student/:studentId/:termId`.
4. Renders a table with subject, score, grade badge, remark, pass/fail badge.
5. Shows summary KPI cards below the table (total subjects, avg score, GPA, passed, failed).
6. "Download Report Card" button calls the PDF endpoint if results are published.

**Auth context:** The `useAuthStore` returns the user object from the JWT. The user has a `student` relation in the DB, but the JWT payload only contains `{ sub, email, schoolId, roles }`. To get the studentId, the page must call `GET /api/v1/students?userId=:userId` or a dedicated endpoint. The simplest approach: call `GET /api/v1/students/my` if it exists, or filter `GET /api/v1/students?userId=currentUser.id`. 

**Simpler approach:** Use the existing `GET /api/v1/results?studentId=...` endpoint with pagination. But this doesn't group by subject nicely. Use `GET /api/v1/results/student/:studentId/:termId` instead.

**Student lookup:** Add a call to `GET /api/v1/students` filtered by the current user's ID, or use the existing students service. Since the `Student` model has `userId` field, the results service's `getStudentResults` already validates `schoolId`. The frontend should call `GET /api/v1/students?page=1&limit=1` to get the student record for the logged-in user (students service filters by schoolId from JWT automatically, and the student linked to this user's userId will be returned).

---

### DD-7: Super Admin Seed Hardening

**Problem:** `seed.ts` hardcodes `irismonde.black@gmail.com` and `Laptop-me-llence`.

**Decision:** Replace with `process.env.SUPER_ADMIN_EMAIL ?? 'admin@gradellence.com'` and `process.env.SUPER_ADMIN_PASSWORD ?? 'Admin@Gradellence2026!'`. Add a console warning to change the default password. No other structural change to the seed.

---

### DD-8: Database Backup Service

**Decision:** Add to `docker-compose.yml`:
```yaml
pg-backup:
  image: prodrigestivus/pg-backup:latest
  container_name: srms-pg-backup
  restart: unless-stopped
  environment:
    SCHEDULE: '@daily'
    BACKUP_DIR: /backups
    POSTGRES_HOST: postgres
    POSTGRES_DB: srms
    POSTGRES_USER: postgres
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - ./backups:/backups
  depends_on:
    postgres:
      condition: service_healthy
```

Add `backups/` to `.gitignore`. Create `docs/BACKUP_RESTORE.md` with restore instructions.

---

### DD-9: Security Hardening

**docker-compose.yml changes:**
- `POSTGRES_PASSWORD: adminroot` → `POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}`
- `JWT_ACCESS_SECRET: your-access-secret-key-change-in-production` → `JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}`
- `JWT_REFRESH_SECRET: your-refresh-secret-key-change-in-production` → `JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}`
- `SMTP_PASS: qpufeglgmmbanwzm` → `SMTP_PASS: ${SMTP_PASS}`
- Add `SENTRY_DSN: ${SENTRY_DSN:-}` (empty default)
- DATABASE_URL must use `${POSTGRES_PASSWORD}` instead of `adminroot`

**server/.env.example:** Create with all variables documented.

**.gitignore fixes:**
- Add `backups/`
- Fix `//prisma/migrations/` → `prisma/migrations/`

---

### DD-10: Production Nginx Config

**File structure:**
```
docker/nginx/nginx.prod.conf   — Nginx configuration
docker-compose.prod.yml        — Production compose override
```

**nginx.prod.conf** will include:
- `limit_req_zone` for auth rate limiting
- HTTP → HTTPS redirect server block
- HTTPS server block with SSL, gzip, security headers, proxy to backend, static file serving

**docker-compose.prod.yml** will use `extends` or service overrides with production-specific settings.

---

### DD-11: REQ-13 Status — Already Implemented

After reading `client/src/services/apiClient.ts`, REQ-13 is already done:
- The response interceptor already calls `useToastStore.getState().addToast('success', message)` for POST/PUT/PATCH/DELETE
- The error interceptor already calls `useToastStore.getState().addToast('error', message)` for non-401 errors
- 401 errors are properly excluded

**No action needed for REQ-13.** The tasks document will note this.

---

## File Inventory — What Will Change

### Backend changes

| File | Change |
|------|--------|
| `server/src/main.ts` | Add `Sentry.init(...)` at top |
| `server/src/common/filters/http-exception.filter.ts` | Add `Sentry.captureException` for 5xx |
| `server/src/modules/assessments/assessments.service.ts` | Remove subscription gates from `create()` and `bulkCreate()` |
| `server/src/modules/results/results.service.ts` | Remove `assertWithinStudentLimit()` private method and calls |
| `server/src/modules/parents/parents.service.ts` | Store refresh token in Redis; add refresh method |
| `server/src/modules/parents/parents.controller.ts` | Add `POST /parents/refresh` endpoint |
| `server/package.json` | Fix `start:prod` script path |
| `server/prisma/seed.ts` | Replace hardcoded super admin credentials with env vars |
| `server/.env.example` | Create with all env var documentation |

### Frontend changes

| File | Change |
|------|--------|
| `client/src/features/assessments/pages/ScoreEntryPage.tsx` | **CREATE** — score entry grid |
| `client/src/features/parents/guards/ParentRoute.tsx` | **CREATE** — route guard |
| `client/src/features/results/pages/MyResultsPage.tsx` | **CREATE** — student result view |
| `client/src/features/assessments/pages/AssessmentsListPage.tsx` | Add "Score Entry" button in header |
| `client/src/features/parents/services/parentApi.ts` | Store refresh token on login; add 401 interceptor |
| `client/src/routes/Routes.tsx` | Add score-entry route, my-results route, wrap parent routes with ParentRoute |

### Infrastructure changes

| File | Change |
|------|--------|
| `docker-compose.yml` | Move secrets to `${VAR}`, add pg-backup service, add SENTRY_DSN |
| `docker-compose.prod.yml` | **CREATE** — production compose override |
| `docker/nginx/nginx.prod.conf` | **CREATE** — production Nginx config |
| `.gitignore` | Add `backups/`, fix `prisma/migrations/` line |
| `docs/BACKUP_RESTORE.md` | **CREATE** — backup and restore documentation |
| `docs/DEPLOYMENT.md` | Update with SSL/certbot instructions |

---

## API Endpoints Used by New Frontend Pages

### ScoreEntryPage (REQ-5)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/classes?page=1&limit=100` | Populate class dropdown |
| GET | `/v1/subjects?page=1&limit=100` | Populate subject dropdown |
| GET | `/v1/sessions?page=1&limit=100` | Populate term dropdown (flatten sessions.terms) |
| GET | `/v1/enrollments/classes/:classId/terms/:termId` | Get enrolled students |
| GET | `/v1/assessments?subjectId=X&termId=Y&page=1&limit=200` | Get existing scores |
| POST | `/v1/assessments/bulk` | Save new scores |
| PUT | `/v1/assessments/:id` | Update existing scores |

### MyResultsPage (REQ-8)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/v1/sessions?page=1&limit=100` | Populate term dropdown |
| GET | `/v1/students?page=1&limit=1` | Get current user's student record |
| GET | `/v1/results/student/:studentId/:termId` | Fetch term results |
| GET | `/v1/results/report-card/:studentId/:termId` | Download PDF (blob) |

### Parent Refresh (REQ-7)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/v1/parents/refresh` | Refresh parent access token |

---

## Component Design Notes

### ScoreEntryPage layout

```
┌─ PageHeader: "Score Entry" ────────────────────────────────┐
├─ FormSection: "Select Class, Subject & Term" ──────────────┤
│  [Class ▾]  [Subject ▾]  [Term ▾]                          │
├─ Grid Table (renders when all 3 selected) ─────────────────┤
│  | Student         | CA1 /20 | CA2 /20 | EXAM /60 | Total │
│  | Adewale, Emeka  | [  18 ] | [  15 ] | [  52  ] |  85   │
│  | Bello, Fatima   | [  _  ] | [  _  ] | [  _   ] |   0   │
│  | ...             |         |         |           |       │
├─ [Save All Scores]  [Cancel] ──────────────────────────────┤
└────────────────────────────────────────────────────────────┘
```

### MyResultsPage layout

```
┌─ PageHeader: "My Results" ─────────────────────────────────┐
├─ [Term ▾]  ─────────────────────────────────── [📄 PDF] ──┤
├─ Summary KPI strip ────────────────────────────────────────┤
│  Subjects: 9  |  Avg: 74.2  |  GPA: 3.4  |  Pass: 8/9    │
├─ Results table ────────────────────────────────────────────┤
│  | Subject        | Score | Grade | Remark       | Pass   │
│  | Mathematics    | 78.5  | [B]   | Good         | ✓      │
│  | English Lang.  | 65.0  | [C]   | Satisfactory | ✓      │
└────────────────────────────────────────────────────────────┘
```

---

## Correctness Properties

The following correctness properties can be verified through property-based or integration tests:

1. **P1 — Subscription gate removal**: For any school with no `SchoolSubscription` record, `POST /api/v1/assessments` with a valid payload must return 201, not 403.

2. **P2 — Score grid save**: For any set of N students with M assessment types, `POST /api/v1/assessments/bulk` must persist exactly N×M records minus any pre-existing ones (which are skipped), and the response must report `success: N×M - skipped`.

3. **P3 — Parent route guard**: A GET request to `/parent/dashboard` without `parent_token` in localStorage must result in a redirect to `/parent/login`, not a render of the dashboard content.

4. **P4 — Token refresh**: When a parent access token expires, the first 401 from any API call must trigger exactly one refresh attempt, and the original request must be retried once with the new token, not twice.

5. **P5 — Seed idempotency**: Running `npx prisma db seed` twice must not create duplicate users; the second run must log "Super admin already exists" and exit cleanly.

6. **P6 — start:prod path**: `node dist/src/main` must resolve without "Cannot find module" after `npm run build`.
