# Requirements Document

## Introduction

This spec covers the remaining Phase 7 items for GRADELLENCE — a multi-tenant School Result Management System (SRMS) built with NestJS (`server/`) and React/Vite (`client/`). Phases 0, 2 (partial), and 3 are already complete, and several unit test files already exist (audit-logs, billing, schools, results service, pdf service, grading util, smoke test). This spec addresses the three gaps that remain:

1. **GitHub Actions CI/CD pipeline** — no `.github/workflows/` directory exists. Every PR needs lint + typecheck + tests for both workspaces, a build verification step, and a placeholder deploy-to-staging job.
2. **Backend unit tests for untested service modules** — `EnrollmentsService`, `AssessmentsService`, `ClassesService`, `SessionsService`, `SubjectsService`, `StudentsService`, `UsersService`, `SubscriptionsService`, `AuthService` (audit-log paths, password-reset stub), `TeachersService`, and `GradeScalesService` have no `.spec.ts` files at all.
3. **HTTP-level tenant-isolation integration tests** — the existing tenant-isolation tests are pure unit tests with mocked Prisma. A dedicated HTTP-level suite (NestJS `Test.createTestingModule` + Supertest against a real test database) is needed to assert that School A's JWT cannot read or mutate School B's data across every guarded resource endpoint.

## Glossary

- **CI_Pipeline**: The GitHub Actions workflow that runs on every pull request and on pushes to `main`.
- **Unit_Test**: A Jest test that stubs all external dependencies (Prisma, Redis, queues) and exercises service logic in isolation.
- **Integration_Test**: A Jest e2e test that boots a real NestJS application against a real Postgres test database and uses Supertest HTTP requests.
- **Tenant_Isolation_Suite**: The set of `Integration_Test` files that assert cross-tenant HTTP requests return `403` or `404`.
- **School_A / School_B**: Two independent tenant accounts used as fixtures in every tenant-isolation test.
- **AuthenticatedUser**: The type at `server/src/common/types/express.types.ts` that carries `id`, `schoolId`, `roles`, and `permissions`.
- **JWT_A / JWT_B**: Access tokens belonging to `School_A` and `School_B` respectively, used in HTTP Authorization headers during tests.
- **Workspace**: Either `server/` or `client/` — the two top-level project directories.
- **Staging_Deploy**: A placeholder GitHub Actions job that represents future deployment automation; it must exist in the workflow file but does not need to perform a real deploy in this phase.

---

## Requirements

### Requirement 1: GitHub Actions CI/CD Pipeline

**User Story:** As a developer, I want every pull request to be automatically validated, so that broken code never reaches the main branch.

#### Acceptance Criteria

1. THE `CI_Pipeline` SHALL be defined in `.github/workflows/ci.yml` at the repository root.
2. WHEN a pull request is opened or updated against `main`, THE `CI_Pipeline` SHALL trigger automatically.
3. WHEN a commit is pushed directly to `main`, THE `CI_Pipeline` SHALL trigger automatically.
4. THE `CI_Pipeline` SHALL run the following steps for the `server/` workspace in sequence, stopping on first failure: install dependencies (`npm ci`), run ESLint (`npm run lint`), run TypeScript type-check (`npx tsc --noEmit`), run the Jest unit test suite (`npm run test -- --ci --runInBand`), and run `nest build` to verify the server compiles.
5. THE `CI_Pipeline` SHALL run the following steps for the `client/` workspace in sequence, stopping on first failure: install dependencies (`npm ci`), run ESLint (`npm run lint`), run TypeScript type-check (`npx tsc --noEmit`), and run `npm run build` to verify the client Vite bundle produces no errors.
6. WHERE environment secrets `DATABASE_URL`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` are configured in the repository, THE `CI_Pipeline` SHALL inject them as environment variables into the server test job.
7. IF any job step exits with a non-zero code, THEN THE `CI_Pipeline` SHALL mark the entire workflow run as failed AND the GitHub Actions job summary SHALL display the name of the failing step; the workflow is considered correctly configured only when both the failure status is set and the failing step name is visible — if either is absent, the requirement is not met.
8. THE `CI_Pipeline` SHALL include a `deploy-staging` job configured with `needs` referencing all previous jobs so that the deploy step is blocked and does not run when any upstream job fails; the job SHALL contain a placeholder step (`echo "Deploy to staging"`) until real deployment automation is added.
9. THE `CI_Pipeline` SHALL cache `node_modules` for both `server/` and `client/` workspaces using the `actions/cache` action keyed on the respective `package-lock.json` hash; on a cache hit, the `npm ci` step SHALL be skipped; on a cache miss, `npm ci` SHALL run and populate the cache for subsequent runs.
10. THE `CI_Pipeline` SHALL run on `ubuntu-latest` runners and target Node.js version `20.x`.
11. IF any required secret (`DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`) is absent from the repository secrets, THEN THE `CI_Pipeline` server test job SHALL fail with an explicit error message identifying the missing variable rather than silently producing incorrect test results.

### Requirement 2: Backend Unit Tests — Tenant-Scoped Services

**User Story:** As a developer, I want unit tests for every service that handles tenant-scoped data, so that regressions in data isolation logic are caught before merge.

#### Acceptance Criteria

1. THE `Unit_Test` suite for `EnrollmentsService` SHALL assert that `findAll()` filters by `student.schoolId` equal to `currentUser.schoolId` in the Prisma `where` clause.
2. THE `Unit_Test` suite for `EnrollmentsService` SHALL assert that `findOne()` throws `NotFoundException` when the enrollment belongs to a different school.
3. THE `Unit_Test` suite for `EnrollmentsService` SHALL assert that `create()` throws `NotFoundException` when the referenced student belongs to a different school.
4. THE `Unit_Test` suite for `EnrollmentsService` SHALL assert that `create()` throws `ConflictException` when the student is already enrolled in the same term.
5. THE `Unit_Test` suite for `EnrollmentsService` SHALL assert that `create()` throws `BadRequestException` when the class has a non-null capacity value that has been reached.
6. THE `Unit_Test` suite for `AssessmentsService` SHALL assert that `findAll()` includes `schoolId: currentUser.schoolId` in the Prisma `where` clause.
7. THE `Unit_Test` suite for `AssessmentsService` SHALL assert that `findOne()` throws `NotFoundException` when the assessment belongs to a different school.
8. THE `Unit_Test` suite for `AssessmentsService` SHALL assert that `create()` throws `ForbiddenException` when no active subscription exists for the school AND SHALL assert that `create()` throws `ForbiddenException` when an active subscription exists but the school's student count is at or above the plan's `maxStudents` limit; these are two distinct test cases.
9. THE `Unit_Test` suite for `AssessmentsService` SHALL assert that `create()` throws `ForbiddenException` when the score exceeds the maxScore.
10. THE `Unit_Test` suite for `AssessmentsService` SHALL assert that `create()` calls `auditLogsService.logAction()` with action `'SCORE_CREATED'` after successfully persisting the assessment.
11. THE `Unit_Test` suite for `StudentsService` SHALL assert that `findAll()` includes `schoolId: currentUser.schoolId` in the Prisma `where` clause.
12. THE `Unit_Test` suite for `StudentsService` SHALL assert that `findOne()` throws `NotFoundException` when the student belongs to a different school.
13. THE `Unit_Test` suite for `StudentsService` SHALL assert that `remove()` performs a soft delete (sets `deletedAt`) rather than a hard delete.
14. THE `Unit_Test` suite for `StudentsService` SHALL assert that `promoteStudents()` runs its enrollment creation inside a Prisma transaction.
15. THE `Unit_Test` suite for `ClassesService` SHALL assert that `findAll()` includes `schoolId: currentUser.schoolId` in the Prisma `where` clause.
16. THE `Unit_Test` suite for `ClassesService` SHALL assert that `findOne()` throws `NotFoundException` when the class belongs to a different school.
17. THE `Unit_Test` suite for `ClassesService` SHALL assert that `remove()` throws `BadRequestException` when the class has any enrollment records.
18. THE `Unit_Test` suite for `SessionsService` SHALL assert that `findAllSessions()` includes `schoolId: currentUser.schoolId` in the Prisma `where` clause.
19. THE `Unit_Test` suite for `SessionsService` SHALL assert that `findOneSession()` throws `NotFoundException` when the session belongs to a different school.
20. THE `Unit_Test` suite for `SessionsService` SHALL assert that `createSession()` throws `BadRequestException` when `startDate` is not before `endDate`.
21. THE `Unit_Test` suite for `SubjectsService` SHALL assert that `findAll()` includes `schoolId: currentUser.schoolId` in the Prisma `where` clause.
22. THE `Unit_Test` suite for `SubjectsService` SHALL assert that `create()` throws `ConflictException` when a subject with the same code already exists in the school.
23. THE `Unit_Test` suite for `SubjectsService` SHALL assert that `findOne()` throws `NotFoundException` when the subject belongs to a different school.
24. THE `Unit_Test` suite for `UsersService` SHALL assert that `findAll()` includes `schoolId: currentUser.schoolId` in the Prisma `where` clause when the caller is a `SCHOOL_ADMIN`.
25. THE `Unit_Test` suite for `UsersService` SHALL assert that `findOne()` throws `ForbiddenException` when a `SCHOOL_ADMIN` requests a user from a different school.
26. THE `Unit_Test` suite for `UsersService` SHALL assert that `create()` throws `ForbiddenException` when a `SCHOOL_ADMIN` attempts to create a user for a different school.
27. THE `Unit_Test` suite for `UsersService` SHALL assert that `update()` calls `auditLogsService.logAction()` with action `'ROLE_CHANGED'` when the role assignment changes.
28. THE `Unit_Test` suite for `SubscriptionsService` SHALL assert that `subscribe()` cancels any existing `ACTIVE` subscriptions for the school before creating a new one.
29. THE `Unit_Test` suite for `SubscriptionsService` SHALL assert that `getCurrentSubscription()` throws `NotFoundException` when no active subscription exists for the school.
30. THE `Unit_Test` suite for `AuthService` SHALL assert that `login()` calls `auditLogsService.logAction()` with action `'LOGIN_FAILED'` when the user is not found, when the password is incorrect, and when the account is deactivated; each of these three branches SHALL be covered by a separate test case.
31. THE `Unit_Test` suite for `AuthService` SHALL assert that `login()` calls `auditLogsService.logAction()` with action `'LOGIN'` after a successful authentication.
32. THE `Unit_Test` suite for `AuthService` SHALL assert that `logout()` calls `auditLogsService.logAction()` with action `'LOGOUT'`.
33. THE `Unit_Test` suite for `AuthService` SHALL assert that `resetPassword()` throws `BadRequestException` (documenting the known stub) until the real implementation is added.
34. THE `Unit_Test` suite for `TeachersService` SHALL assert that `findAll()` includes `schoolId: currentUser.schoolId` in the Prisma `where` clause.
35. THE `Unit_Test` suite for `TeachersService` SHALL assert that `findOne()` throws `NotFoundException` when the teacher belongs to a different school.
36. THE `Unit_Test` suite for `GradeScalesService` SHALL assert that `findAll()` includes `schoolId: currentUser.schoolId` in the Prisma `where` clause.
37. THE `Unit_Test` suite for `GradeScalesService` SHALL assert that `create()` throws `ConflictException` when overlapping grade bands exist within the same school.

### Requirement 3: HTTP-Level Tenant-Isolation Integration Tests

**User Story:** As a security reviewer, I want HTTP-level tests that prove School A's token cannot access School B's data, so that any future service regression that re-introduces a cross-tenant leak is caught in CI.

#### Acceptance Criteria

1. THE `Tenant_Isolation_Suite` SHALL boot a real NestJS application using `Test.createTestingModule({ imports: [AppModule] })` against a dedicated Postgres test database (`DATABASE_URL` pointing to `srms_test`).
2. THE `Tenant_Isolation_Suite` SHALL register two independent school accounts (`School_A` and `School_B`) via `POST /api/v1/auth/register` in `beforeAll`, obtain `JWT_A` and `JWT_B`, and seed at least one owned resource for `School_B` in each category (student, class, session, subject, enrollment, assessment, result, invoice, audit-log entry) so that cross-tenant 404/403 assertions are testable.
3. WHEN `JWT_A` is used to call `GET /api/v1/students` (list), THE `Tenant_Isolation_Suite` SHALL assert the response contains only records where `schoolId === School_A.id` and zero records belonging to `School_B`.
4. WHEN `JWT_A` is used to call `GET /api/v1/students/:id` with an id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
5. WHEN `JWT_A` is used to call `PATCH /api/v1/students/:id` with an id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
6. WHEN `JWT_A` is used to call `DELETE /api/v1/students/:id` with an id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
7. WHEN `JWT_A` is used to call `GET /api/v1/classes` (list), THE `Tenant_Isolation_Suite` SHALL assert the response contains only classes belonging to `School_A`.
8. WHEN `JWT_A` is used to call `GET /api/v1/classes/:id` with an id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
9. WHEN `JWT_A` is used to call `GET /api/v1/sessions` (list), THE `Tenant_Isolation_Suite` SHALL assert the response contains only sessions belonging to `School_A`.
10. WHEN `JWT_A` is used to call `GET /api/v1/sessions/:id` with an id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
11. WHEN `JWT_A` is used to call `GET /api/v1/subjects` (list), THE `Tenant_Isolation_Suite` SHALL assert the response contains only subjects belonging to `School_A`.
12. WHEN `JWT_A` is used to call `GET /api/v1/subjects/:id` with an id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
13. WHEN `JWT_A` is used to call `GET /api/v1/enrollments` (list), THE `Tenant_Isolation_Suite` SHALL assert the response contains only enrollments whose student belongs to `School_A`.
14. WHEN `JWT_A` is used to call `GET /api/v1/enrollments/:id` with an id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
15. WHEN `JWT_A` is used to call `GET /api/v1/assessments` (list), THE `Tenant_Isolation_Suite` SHALL assert the response contains only assessments where `schoolId === School_A.id`.
16. WHEN `JWT_A` is used to call `GET /api/v1/assessments/:id` with an id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
17. WHEN `JWT_A` is used to call `GET /api/v1/results` (list), THE `Tenant_Isolation_Suite` SHALL assert the response contains only results where `schoolId === School_A.id`.
18. WHEN `JWT_A` is used to call `GET /api/v1/billing/invoices/:id` with an invoice id belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.
19. WHEN `JWT_A` is used to call `GET /api/v1/audit-logs` (list), THE `Tenant_Isolation_Suite` SHALL assert the response contains only audit log entries whose actor belongs to `School_A`.
20. WHEN `JWT_A` is used to call `GET /api/v1/audit-logs/:id` with a log id whose actor belongs to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `403`.
21. IF a request is made to any guarded endpoint without an Authorization header, THEN THE `Tenant_Isolation_Suite` SHALL assert the response status is `401`.
22. THE `Tenant_Isolation_Suite` SHALL truncate all test data in `afterAll` using the `cleanupDatabase` helper from `server/test/test-utils.ts`.
23. THE `Tenant_Isolation_Suite` SHALL be located at `server/test/tenant-isolation.e2e-spec.ts` and SHALL run via the existing `npm run test:e2e` script using `server/test/jest-e2e.json`.
24. WHEN `JWT_A` is used to call `GET /api/v1/results/broadsheet` with `classId` and `termId` belonging to `School_B`, THE `Tenant_Isolation_Suite` SHALL assert the response status is `404`.

### Requirement 4: Client-Side Test Infrastructure Setup

**User Story:** As a developer, I want a test framework configured for the React client, so that component and integration tests can be written as frontend features are completed.

#### Acceptance Criteria

1. THE `client/` workspace SHALL have Vitest and React Testing Library installed as `devDependencies` (`vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`).
2. THE `client/package.json` SHALL contain a `"test"` script that runs `vitest --run` and a `"test:watch"` script that runs `vitest`.
3. THE `client/vite.config.ts` (or a separate `vitest.config.ts`) SHALL include a `test` block specifying `environment: 'jsdom'`, `setupFiles: ['./src/test/setup.ts']`, and path alias resolution mirroring the aliases defined in `vite.config.ts` (e.g. `@routes`, `@features`, `@store`, `@services`) so that component tests can import using the same aliases as the application code.
4. THE `client/src/test/setup.ts` file SHALL import `@testing-library/jest-dom` to extend Vitest's `expect` matchers.
5. THE `client/src/test/App.test.tsx` file SHALL contain at least one passing smoke test that renders the root `<App />` component without throwing, and asserts that the rendered container has at least one child element present in the DOM.
6. THE `CI_Pipeline` SHALL execute `npm run test` in the `client/` workspace as part of the client job; the step SHALL be considered passing when the command exits with code 0 and zero test failures are reported.
