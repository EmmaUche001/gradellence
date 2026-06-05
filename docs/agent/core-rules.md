# SRMS Core Engineering Rules (NON-NEGOTIABLE)

This file defines strict rules for all backend and frontend development in the SaaS School Result Management System.

---

## 1. Multi-Tenancy Rule (CRITICAL)

* Every tenant is a school
* EVERY tenant-owned entity MUST include `schoolId`
* NO query is allowed without tenant filtering

### Forbidden:

* cross-tenant data access
* missing schoolId in models
* global unscoped queries

---

## 2. Architecture Rule

* Backend MUST use Modular Monolith architecture
* Frontend MUST use feature-based architecture
* Microservices are NOT allowed initially

---

## 3. Business Logic Rule

* NEVER put business logic in controllers
* Controllers ONLY handle request/response
* All logic MUST live in services

---

## 4. Database Access Rule

* ALL database operations MUST go through services/repositories
* NO direct Prisma calls in controllers

---

## 5. RBAC Security Rule

* ALL sensitive endpoints MUST use RBAC guards
* Permissions MUST be enforced via decorators + guards

---

## 6. Validation Rule

* ALL incoming data MUST use DTO validation
* class-validator MUST be used for backend validation

---

## 7. Module Isolation Rule

* Modules MUST NOT tightly couple with each other
* Cross-module logic MUST go through service interfaces or events

---

## 8. Security Rule

* JWT authentication required
* Refresh token rotation required
* Rate limiting MUST be enabled
* Helmet and CORS MUST be enabled

---

## 9. Logging Rule

* All major actions MUST be logged
* Audit logs are mandatory for:

  * results
  * grades
  * user actions
  * authentication events

---

## 10. Prohibited Practices

DO NOT:

* duplicate business logic
* bypass RBAC
* skip validation
* hardcode secrets
* ignore tenant isolation
* use any types excessively
