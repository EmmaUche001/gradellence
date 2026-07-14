# Implementation Plan: GRADELLENCE Phase 7 — CI/CD & Testing Gaps

## Overview

This plan closes all Phase 7 gaps: a GitHub Actions CI/CD pipeline, unit tests for 11 untested backend service modules, an HTTP-level tenant-isolation integration test suite, and client-side Vitest infrastructure. All tasks are purely additive — no existing files are deleted and no API or schema changes are required.

No property-based tests are included: the design document explicitly assessed PBT as inapplicable for all four deliverables (CI YAML, discrete-path unit tests, I/O-heavy integration tests, and a render smoke test).

---

## Tasks

- [ ] 1. Create GitHub Actions CI/CD pipeline
  - [ ] 1.1 Create `.github/workflows/ci.yml` with triggers, Node.js version, and runner config
    - Define `on: push` (branches: [main]) and `on: pull_request` (branches: [main]) triggers
    - Set default Node.js version to `20.x` via `actions/setup-node`
    - All jobs run on `ubuntu-latest`
    - _Requirements: 1.1, 1.2, 1.3, 1.10_
  - [x] 1.2 Implement `server-ci` job with dependency cache and secret validation
    - Use `actions/cache` keyed on `hashFiles('server/package-lock.json')`; skip `npm ci` on cache hit
    - Add secret-validation shell step before tests: check `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET` are non-empty; `exit 1` with explicit error message if any are absent
    - Inject the three secrets as environment variables into the job
    - _Requirements: 1.4, 1.6, 1.9, 1.11_
  - [ ] 1.3 Add server-ci steps: lint → typecheck → test → build
    - `npm run lint` in `server/` working directory
    - `npx tsc --noEmit` in `server/`
    - `npm run test -- --ci --runInBand` in `server/`
    - `nest build` in `server/` to verify compilation
    - Each step must stop on non-zero exit (no `continue-on-error`)
    - _Requirements: 1.4, 1.7_
  - [ ] 1.4 Implement `client-ci` job with dependency cache and all steps
    - Use `actions/cache` keyed on `hashFiles('client/package-lock.json')`; skip `npm ci` on cache hit
    - Steps in sequence: `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`
    - _Requirements: 1.5, 1.9_
  - [ ] 1.5 Add `deploy-staging` placeholder job
    - Set `needs: [server-ci, client-ci]` so it is blocked when any upstream job fails
    - Single step: `echo "Deploy to staging"`
    - _Requirements: 1.8_

- [ ] 2. Backend unit tests — tenant-scoped list and single-resource services
  - [ ] 2.1 Create `server/src/modules/enrollments/enrollments.service.spec.ts`
    - Mock `PrismaService`, no `AuditLogsService` needed
    - `findAll()`: assert `where` includes `student: { schoolId: currentUser.schoolId }`
    - `findOne()`: assert `NotFoundException` when result is `null` (different school)
    - `create()`: assert `NotFoundException` when referenced student's `schoolId` differs
    - `create()`: assert `ConflictException` when student already enrolled in same term
    - `create()`: assert `BadRequestException` when class capacity is non-null and reached
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ] 2.2 Create `server/src/modules/classes/classes.service.spec.ts`
    - Mock `PrismaService`
    - `findAll()`: assert `where` includes `schoolId: currentUser.schoolId`
    - `findOne()`: assert `NotFoundException` when class belongs to different school
    - `remove()`: assert `BadRequestException` when class has enrollment records
    - _Requirements: 2.15, 2.16, 2.17_
  - [ ] 2.3 Create `server/src/modules/sessions/sessions.service.spec.ts`
    - Mock `PrismaService`
    - `findAllSessions()`: assert `where` includes `schoolId: currentUser.schoolId`
    - `findOneSession()`: assert `NotFoundException` when session belongs to different school
    - `createSession()`: assert `BadRequestException` when `startDate` >= `endDate`
    - _Requirements: 2.18, 2.19, 2.20_
  - [ ] 2.4 Create `server/src/modules/subjects/subjects.service.spec.ts`
    - Mock `PrismaService`
    - `findAll()`: assert `where` includes `schoolId: currentUser.schoolId`
    - `create()`: assert `ConflictException` when a subject with the same code already exists in the school
    - `findOne()`: assert `NotFoundException` when subject belongs to different school
    - _Requirements: 2.21, 2.22, 2.23_

- [ ] 3. Checkpoint — verify Group 1 unit tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Backend unit tests — student, user, and subscription services
  - [ ] 4.1 Create `server/src/modules/students/students.service.spec.ts`
    - Mock `PrismaService`; mock `BullMQ Queue` (`{ add: jest.fn() }`) if used by this service
    - `findAll()`: assert `where` includes `schoolId: currentUser.schoolId`
    - `findOne()`: assert `NotFoundException` when student belongs to different school
    - `remove()`: assert that `prisma.student.update` is called with a `deletedAt` field set (soft delete), not `prisma.student.delete`
    - `promoteStudents()`: assert `prisma.$transaction` is called; mock it with `jest.fn().mockImplementation(async (fn) => fn(prisma))`
    - _Requirements: 2.11, 2.12, 2.13, 2.14_
  - [ ] 4.2 Create `server/src/modules/users/users.service.spec.ts`
    - Mock `PrismaService`, mock `AuditLogsService` (`{ logAction: jest.fn().mockResolvedValue(undefined) }`)
    - `findAll()`: assert `where` includes `schoolId: currentUser.schoolId` when caller role is `SCHOOL_ADMIN`
    - `findOne()`: assert `ForbiddenException` when a `SCHOOL_ADMIN` requests a user from a different school
    - `create()`: assert `ForbiddenException` when a `SCHOOL_ADMIN` provides a `schoolId` differing from their own
    - `update()`: assert `auditLogsService.logAction` called with `'ROLE_CHANGED'` when role field changes
    - _Requirements: 2.24, 2.25, 2.26, 2.27_
  - [ ] 4.3 Create `server/src/modules/subscriptions/subscriptions.service.spec.ts`
    - Mock `PrismaService`
    - `subscribe()`: assert that existing `ACTIVE` subscriptions are cancelled (status updated) before a new subscription is created; verify via mock call order or separate `prisma.schoolSubscription.updateMany` assertion
    - `getCurrentSubscription()`: assert `NotFoundException` when no active subscription row exists
    - _Requirements: 2.28, 2.29_
  - [ ] 4.4 Create `server/src/modules/teachers/teachers.service.spec.ts`
    - Mock `PrismaService`; mock `BullMQ Queue` if used
    - `findAll()`: assert `where` includes `schoolId: currentUser.schoolId`
    - `findOne()`: assert `NotFoundException` when teacher belongs to different school
    - _Requirements: 2.34, 2.35_

- [ ] 5. Backend unit tests — assessments, auth, and grade-scales services
  - [ ] 5.1 Create `server/src/modules/assessments/assessments.service.spec.ts`
    - Mock `PrismaService`, mock `AuditLogsService` (`{ logAction: jest.fn().mockResolvedValue(undefined) }`)
    - `findAll()`: assert `where` includes `schoolId: currentUser.schoolId`
    - `findOne()`: assert `NotFoundException` when assessment belongs to different school
    - `create()` — no active subscription: assert `ForbiddenException`
    - `create()` — subscription active but `studentCount >= plan.maxStudents`: assert `ForbiddenException` (separate test case from above)
    - `create()` — score exceeds `maxScore`: assert `ForbiddenException`
    - `create()` happy path: assert `auditLogsService.logAction` called with `'SCORE_CREATED'` and matching arguments
    - _Requirements: 2.6, 2.7, 2.8, 2.9, 2.10_
  - [ ] 5.2 Create `server/src/modules/auth/auth.service.spec.ts`
    - Mock `PrismaService`, `AuditLogsService`, `JwtService` (`{ sign: jest.fn().mockReturnValue('mock-token') }`), `ConfigService` (`{ get: jest.fn().mockReturnValue('15m') }`), `RedisService` (`{ storeRefreshToken: jest.fn(), deleteRefreshToken: jest.fn(), getRefreshToken: jest.fn() }`)
    - `login()` — user not found: assert `auditLogsService.logAction` called with `'LOGIN_FAILED'`
    - `login()` — password incorrect: assert `auditLogsService.logAction` called with `'LOGIN_FAILED'` (separate test)
    - `login()` — account deactivated: assert `auditLogsService.logAction` called with `'LOGIN_FAILED'` (separate test)
    - `login()` happy path: assert `auditLogsService.logAction` called with `'LOGIN'`
    - `logout()`: assert `auditLogsService.logAction` called with `'LOGOUT'`
    - `resetPassword()`: assert `BadRequestException` is thrown (documents the stub behaviour)
    - _Requirements: 2.30, 2.31, 2.32, 2.33_
  - [ ] 5.3 Create `server/src/modules/grade-scales/grade-scales.service.spec.ts`
    - Mock `PrismaService`
    - `findAll()`: assert `where` includes `schoolId: currentUser.schoolId`
    - `create()`: assert `ConflictException` when overlapping grade bands exist within the same school (mock `prisma.gradeBand.findFirst` to return a conflicting record)
    - _Requirements: 2.36, 2.37_

- [ ] 6. Checkpoint — verify all 11 backend unit test files pass
  - Run `cd server && npm run test -- --ci --runInBand` and confirm zero failures.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. HTTP-level tenant-isolation integration test suite
  - [ ] 7.1 Verify `server/test/test-utils.ts` exports `createTestApp` and `cleanupDatabase`; add any missing helpers
    - Confirm `createTestApp()` boots `AppModule` with `ValidationPipe`, URI versioning, and global prefix matching `main.ts`
    - Confirm `cleanupDatabase(prisma)` truncates all tenant-scoped tables in dependency order
    - Add helpers if they are absent or incomplete
    - _Requirements: 3.1, 3.22_
  - [ ] 7.2 Create `server/test/tenant-isolation.e2e-spec.ts` — app bootstrap and fixture seeding
    - Import `createTestApp`, `cleanupDatabase` from `test-utils.ts`
    - `beforeAll`: boot app, call `POST /api/v1/auth/register` twice → store `{ tokenA, schoolIdA }` and `{ tokenB, schoolIdB }`
    - `beforeAll`: implement `seedSchoolBResources(tokenB)` that POSTs to create: student B, class B, session B (+ term B), subject B, enrollment B, assessment B, invoice B (via subscribe); store returned IDs in a `SchoolBFixtures` object
    - `beforeAll`: ensure at least one audit log entry exists for School B (any write action auto-generates one)
    - `afterAll`: call `cleanupDatabase(prisma)` then `app.close()`
    - _Requirements: 3.1, 3.2, 3.22_
  - [ ] 7.3 Implement list-endpoint isolation assertions (GET list — School A sees only own data)
    - `GET /api/v1/students` with `tokenA`: assert every item has `schoolId === schoolIdA` AND `schoolBFixtures.studentId` is not in the response list
    - Repeat for `/classes`, `/sessions`, `/subjects`, `/enrollments`, `/assessments`, `/results`
    - `GET /api/v1/audit-logs` with `tokenA`: assert every entry's actor belongs to School A
    - _Requirements: 3.3, 3.7, 3.9, 3.11, 3.13, 3.15, 3.17, 3.19_
  - [ ] 7.4 Implement single-resource cross-tenant 404 assertions
    - `GET /api/v1/students/:schoolBStudentId` with `tokenA` → expect 404
    - `PATCH /api/v1/students/:schoolBStudentId` with `tokenA` → expect 404
    - `DELETE /api/v1/students/:schoolBStudentId` with `tokenA` → expect 404
    - `GET /api/v1/classes/:schoolBClassId` with `tokenA` → expect 404
    - `GET /api/v1/sessions/:schoolBSessionId` with `tokenA` → expect 404
    - `GET /api/v1/subjects/:schoolBSubjectId` with `tokenA` → expect 404
    - `GET /api/v1/enrollments/:schoolBEnrollmentId` with `tokenA` → expect 404
    - `GET /api/v1/assessments/:schoolBAssessmentId` with `tokenA` → expect 404
    - `GET /api/v1/billing/invoices/:schoolBInvoiceId` with `tokenA` → expect 404
    - `GET /api/v1/results/broadsheet?classId=<schoolBClassId>&termId=<schoolBTermId>` with `tokenA` → expect 404
    - _Requirements: 3.4, 3.5, 3.6, 3.8, 3.10, 3.12, 3.14, 3.16, 3.18, 3.24_
  - [ ] 7.5 Implement audit-log 403 and unauthenticated 401 assertions
    - `GET /api/v1/audit-logs/:schoolBLogId` with `tokenA` → expect 403
    - `GET /api/v1/students` (no Authorization header) → expect 401
    - `GET /api/v1/classes` (no Authorization header) → expect 401
    - `POST /api/v1/students` (no Authorization header) → expect 401
    - _Requirements: 3.20, 3.21_

- [ ] 8. Checkpoint — verify e2e suite runs against srms_test
  - Run `cd server && npm run test:e2e` with `DATABASE_URL` pointing to `srms_test` and confirm zero failures.
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Client-side test infrastructure
  - [ ] 9.1 Install Vitest and React Testing Library devDependencies in `client/`
    - Add to `client/package.json` devDependencies: `vitest@^1.6.0`, `@vitest/ui@^1.6.0`, `@testing-library/react@^14.3.1`, `@testing-library/user-event@^14.5.2`, `@testing-library/jest-dom@^6.4.6`, `jsdom@^24.1.3`
    - Add `"test": "vitest --run"` and `"test:watch": "vitest"` scripts to `client/package.json`
    - Run `npm install` in `client/` to update `package-lock.json`
    - _Requirements: 4.1, 4.2_
  - [ ] 9.2 Configure Vitest test block in `client/vite.config.ts`
    - Add `test` block to the existing Vite config specifying `environment: 'jsdom'`, `globals: true`, `setupFiles: ['./src/test/setup.ts']`
    - Include all path aliases (`@`, `@components`, `@features`, `@hooks`, `@lib`, `@pages`, `@routes`, `@services`, `@store`, `@types`, `@utils`) mirroring the existing `resolve.alias` entries
    - _Requirements: 4.3_
  - [ ] 9.3 Create `client/src/test/setup.ts`
    - Single import: `import '@testing-library/jest-dom'`
    - _Requirements: 4.4_
  - [ ] 9.4 Create `client/src/test/App.test.tsx` smoke test
    - Import `render` from `@testing-library/react`
    - Wrap `<App />` in `MemoryRouter` (from `react-router-dom`) and `QueryClientProvider` (from `@tanstack/react-query`) with `retry: false`
    - Assert `container.children.length` is greater than 0
    - _Requirements: 4.5_

- [ ] 10. Update `ci.yml` to include client test step
  - Confirm that the `client-ci` job already includes `npm run test` as a step (added in task 1.4); if not, add it
  - Verify the step is placed after typecheck and before build
  - _Requirements: 4.6, 1.5_

- [ ] 11. Final checkpoint — all tests and CI configuration complete
  - Run `cd server && npm run test -- --ci --runInBand` to confirm all 11 new unit test files pass alongside existing tests.
  - Run `cd client && npm run test` to confirm the App smoke test passes.
  - Review `.github/workflows/ci.yml` to confirm both jobs and the deploy-staging placeholder are correctly structured.
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP — there are none in this plan because no PBT applies and all unit/integration tests are mandatory for the CI gate.
- The e2e suite (`task 7`) requires a live `srms_test` Postgres database. It is intentionally excluded from the `server-ci` CI job until a Postgres service container is provisioned in a future CI phase; it runs locally via `npm run test:e2e`.
- Backend unit test files follow the `server/src/modules/<module>/<module>.service.spec.ts` naming convention to be picked up by Jest's default testMatch pattern.
- The `prisma.$transaction` mock pattern is: `jest.fn().mockImplementation(async (fn) => fn(prisma))` — needed for `StudentsService.promoteStudents` (task 4.1).
- The App smoke test (task 9.4) may require `jsdom` stubs for `matchMedia` or `ResizeObserver` in `setup.ts` if `App.tsx` references those APIs at render time.
- Tasks 1.2–1.5 create a single file (`.github/workflows/ci.yml`). They are split logically but implemented together in one file authoring pass.

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1", "2.2", "2.3", "2.4", "9.1"] },
    { "id": 1, "tasks": ["1.2", "4.1", "4.2", "4.3", "4.4", "9.2"] },
    { "id": 2, "tasks": ["1.3", "5.1", "5.2", "5.3", "9.3"] },
    { "id": 3, "tasks": ["1.4", "7.1", "9.4"] },
    { "id": 4, "tasks": ["1.5", "7.2"] },
    { "id": 5, "tasks": ["7.3", "10"] },
    { "id": 6, "tasks": ["7.4"] },
    { "id": 7, "tasks": ["7.5"] }
  ]
}
```
