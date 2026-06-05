# ENGINEERING_ARCHITECTURE.md

# Enterprise Engineering Architecture & Governance Specification

## SaaS School Result Management System (SRMS)

---

# Purpose

This document defines:

* engineering rules
* architectural boundaries
* scalability strategy
* implementation standards
* security requirements
* SaaS constraints
* AI agent development governance

This document MUST be treated as the source of truth for all engineering decisions.

All AI coding agents and developers MUST follow this specification strictly.

---

# Architectural Philosophy

## Core Principles

The system MUST be:

* modular
* scalable
* secure
* maintainable
* testable
* production-ready
* SaaS-oriented
* tenant-isolated

The project MUST prioritize:

1. correctness
2. maintainability
3. scalability
4. security
5. developer experience

over premature optimization.

---

# System Architecture

## Initial Architecture Style

Use:

* Modular Monolith Architecture

DO NOT begin with microservices.

Reason:

* lower operational complexity
* easier deployment
* easier debugging
* better development speed
* easier transaction management

Microservices should ONLY be extracted when operationally necessary.

---

# Domain-Driven Design (DDD)

The backend MUST be separated into bounded contexts.

## Bounded Contexts

### Authentication Context

Responsibilities:

* authentication
* authorization
* sessions
* tokens
* RBAC

### Academic Context

Responsibilities:

* students
* teachers
* subjects
* classes
* enrollment
* sessions
* terms

### Results Context

Responsibilities:

* assessments
* grading
* computations
* report generation

### Billing Context

Responsibilities:

* subscriptions
* invoices
* payments
* plan limits

### Notifications Context

Responsibilities:

* emails
* SMS
* alerts
* notification preferences

### Analytics Context

Responsibilities:

* reporting
* charts
* statistics
* performance insights

Contexts MUST remain loosely coupled.

---

# Multi-Tenant Architecture

## Tenant Isolation Strategy

This platform uses:

* row-level multi-tenancy

Each school is a tenant.

Every tenant-owned entity MUST include:

* schoolId

Example entities:

* students
* teachers
* classes
* subjects
* results
* assessments

---

# Tenant Security Rules

## Mandatory Rules

### RULE 1

ALL tenant-owned queries MUST filter by:

```ts
schoolId
```

### RULE 2

NO controller should access Prisma directly.

Use:

* services
* repositories

### RULE 3

Tenant validation MUST happen:

* in guards
* middleware
* repositories

### RULE 4

Cross-tenant data access is forbidden.

### RULE 5

Tenant-aware logging is mandatory.

---

# Backend Architecture Standards

## NestJS Standards

Required NestJS patterns:

* modules
* services
* controllers
* guards
* interceptors
* filters
* DTO validation
* dependency injection

---

# Forbidden Backend Practices

## DO NOT:

* place business logic inside controllers
* access database directly from controllers
* skip DTO validation
* bypass RBAC guards
* hardcode secrets
* use any types excessively
* duplicate business logic
* couple modules tightly

---

# Required Backend Practices

## MUST:

* use DTOs
* validate requests
* use services for business logic
* use repositories/data-access layers
* implement structured logging
* implement exception filters
* implement RBAC guards
* use environment variables
* write tests

---

# API Governance

## API Versioning

Use:

```txt
/api/v1/
```

Example:

```txt
/api/v1/students
```

---

# API Response Standard

## Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {},
  "meta": {}
}
```

## Error Response

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Requested resource not found"
  }
}
```

---

# Pagination Standard

Use:

```txt
?page=1&limit=20
```

Response:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

---

# Validation Standards

Use:

* class-validator
* class-transformer

ALL incoming requests MUST use DTO validation.

---

# Authentication Standards

## Authentication Stack

* JWT access tokens
* refresh tokens
* RBAC
* secure password hashing
* token rotation

## Password Hashing

Use:

* Argon2 preferred
  OR
* bcrypt

---

# Security Standards

## Required Security Features

### Mandatory

* Helmet
* CORS
* rate limiting
* request validation
* secure cookies
* brute-force protection
* refresh token rotation
* audit logging

---

# RBAC Standards

Use:

* permissions
* roles
* guards
* decorators

Example:

```ts
@Permissions('results.publish')
```

---

# Audit Logging

Audit logs are mandatory.

Track:

* score changes
* result publication
* login activity
* role changes
* user actions

Audit log fields:

```txt
actorId
action
entityType
entityId
timestamp
previousValue
newValue
```

---

# Error Handling Standards

## Global Exception Filter

All unhandled exceptions MUST pass through:

* centralized exception filters

---

# Logging Standards

Use:

* structured logging

Recommended:

* Pino
  OR
* Winston

## Log Levels

* info
* warn
* error
* debug

---

# Observability

## Monitoring Stack

Recommended:

* Sentry
* Prometheus
* Grafana

Track:

* request latency
* error rate
* memory usage
* CPU usage
* database performance

---

# Database Standards

## Database

Use:

* PostgreSQL

## ORM

Use:

* Prisma

---

# Prisma Rules

## MUST:

* use migrations
* define indexes
* use transactions
* enforce relations

## DO NOT:

* use raw SQL unnecessarily
* skip indexes
* duplicate schemas

---

# Database Naming Conventions

## Tables

Use:

* snake_case

## Columns

Use:

* snake_case

## Prisma Models

Use:

* PascalCase

---

# Required Audit Fields

All major entities MUST include:

```txt
createdAt
updatedAt
deletedAt
createdBy
updatedBy
```

---

# Soft Delete Policy

Use:

```txt
deletedAt
```

Do NOT hard delete records unless absolutely necessary.

---

# Indexing Strategy

## Required Indexes

Example:

```txt
INDEX(schoolId)
INDEX(studentId)
INDEX(classId)
```

## Composite Indexes

Example:

```txt
UNIQUE(schoolId, email)
UNIQUE(studentId, subjectId, termId)
```

---

# Transaction Standards

Use database transactions for:

* result publication
* student promotion
* bulk uploads
* billing operations

---

# Caching Strategy

Use:

* Redis

Cache:

* analytics
* dashboards
* computed reports

---

# Queue & Background Jobs

Use:

* BullMQ + Redis

Background jobs include:

* email sending
* report generation
* notifications
* exports

---

# Event-Driven Internal Architecture

Use domain events internally.

Example events:

```txt
SchoolCreatedEvent
ResultPublishedEvent
StudentPromotedEvent
```

This reduces tight coupling.

---

# Frontend Engineering Standards

## Frontend Principles

The frontend MUST be:

* modular
* type-safe
* responsive
* accessible
* maintainable

---

# Frontend State Strategy

Use:

* Zustand for local/global state
* TanStack Query for server state

---

# Frontend Form Standards

Use:

* React Hook Form
* Zod validation

---

# Frontend Component Rules

## MUST:

* keep components reusable
* isolate feature logic
* avoid prop drilling
* use typed props

## DO NOT:

* place API calls everywhere
* duplicate UI logic
* create massive components

---

# UI/UX Standards

## Design Direction

The platform should resemble:

* modern SaaS dashboards
* clean enterprise admin systems

Focus on:

* whitespace
* typography
* responsiveness
* consistency

---

# Accessibility Standards

Follow:

* WCAG principles

Requirements:

* keyboard navigation
* semantic HTML
* accessible labels
* color contrast compliance

---

# Infrastructure Standards

## Required Infrastructure

### Reverse Proxy

* Nginx

### CDN

* Cloudflare recommended

### File Storage

* AWS S3 preferred

### Database Hosting

* managed PostgreSQL

---

# Environment Strategy

Environments:

* local
* development
* staging
* production

Each environment MUST have isolated:

* databases
* secrets
* configurations

---

# Environment Variables

Use:

```txt
.env
```

DO NOT hardcode:

* secrets
* credentials
* API keys

---

# CI/CD Standards

Use:

* GitHub Actions

Pipelines MUST include:

* linting
* tests
* type checks
* build verification

---

# Testing Standards

## Backend Testing

Use:

* Jest
* Supertest

## Frontend Testing

Use:

* React Testing Library

---

# Required Test Types

## Backend

* unit tests
* integration tests
* e2e tests

## Frontend

* component tests
* integration tests

---

# Performance Standards

## Backend

* optimize database queries
* avoid N+1 queries
* paginate large datasets
* cache expensive computations

## Frontend

* lazy loading
* code splitting
* memoization where necessary

---

# SaaS Subscription Standards

Plans MUST support:

* feature gating
* tenant quotas
* plan restrictions

Example:

```txt
Basic Plan:
- 500 students

Pro Plan:
- unlimited students
```

---

# Disaster Recovery Strategy

Requirements:

* automated backups
* rollback strategy
* migration rollback support
* uptime monitoring

---

# AI Coding Agent Rules

## Mandatory Rules

### RULE 1

NEVER place business logic inside controllers.

### RULE 2

ALL database access MUST go through repositories/services.

### RULE 3

ALL tenant-owned queries MUST include:

```ts
schoolId
```

### RULE 4

ALL APIs MUST use DTO validation.

### RULE 5

ALL endpoints MUST use RBAC guards where necessary.

### RULE 6

DO NOT tightly couple modules.

### RULE 7

DO NOT duplicate business logic.

### RULE 8

DO NOT skip error handling.

### RULE 9

ALL major operations MUST be logged.

### RULE 10

ALL code MUST remain strongly typed.

---

# Architectural Decision Records (ADR)

Maintain:

```txt
/docs/adr/
```

Examples:

```txt
ADR-001-use-prisma.md
ADR-002-use-modular-monolith.md
ADR-003-use-postgresql.md
```

---

# Scalability Philosophy

Build:

* modular monolith first

Scale to:

* distributed services later only if necessary

Premature microservices are forbidden.

---

# Expected Engineering Quality

This platform MUST meet:

* enterprise engineering standards
* production SaaS standards
* scalable architecture standards
* security best practices
* maintainability best practices

This is a commercial-grade software platform.

NOT a tutorial project.
