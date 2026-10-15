# Architecture Overview

## What this system is

A single Node.js API server that is the **only** gateway to the ecommerce data. Two frontends use it:

| Client | Uses | Auth |
| --- | --- | --- |
| Admin dashboard (`e-commerce-admin-panel`, React/Vite) | `/api/auth`, `/api/products`, `/api/admin/*` | Supabase Auth access token + an active `admin_profiles` row |
| Public storefront | `/api/store/*` | None (public, cacheable) |

```
Admin Dashboard ──┐   Bearer <Supabase access token>
                  ▼
            Node.js API Server  ──────────────►  Supabase Postgres  (DATABASE_URL, API server only)
                  ▲      │
Storefront ───────┘      └───────────────────►  ImageKit  (signing uploads, verifying & deleting files)

Browser ── direct upload (signed by the API) ──►  ImageKit
```

Neither frontend reads or writes Supabase tables. The admin dashboard uses Supabase **only** to sign in (to get an access token). The database enforces this: RLS is on for every table with no policies, and privileges are revoked from Supabase's `anon` and `authenticated` roles ([ADR 002](../decisions/002-data-access-through-api-only.md)).

## Technology

| Concern | Choice | Why |
| --- | --- | --- |
| Runtime | Node.js 24, TypeScript (ESM) | Current LTS |
| HTTP | Fastify 5 | Fast, schema-driven, first-class hooks |
| Validation & contracts | Zod 4 + `fastify-type-provider-zod` | One schema validates input, types handlers, filters responses, and generates OpenAPI |
| Database access | `postgres` (postgres.js), hand-written SQL | Transactions, row locks, JSON aggregation, no ORM codegen ([ADR 002](../decisions/002-data-access-through-api-only.md)) |
| Auth | Supabase Auth JWTs verified locally with `jose` | No per-request network call ([ADR 004](../decisions/004-supabase-jwt-verification.md)) |
| Images | ImageKit, with direct browser upload | The API never proxies image bytes ([ADR 005](../decisions/005-imagekit-direct-upload-and-deletion-outbox.md)) |
| Logging | pino (Fastify built-in), JSON in production | Structured, with auth headers redacted |
| Tests | Vitest; Fastify `inject` + mocked repositories; optional real-Postgres integration suite | |
| Lint | oxlint | Same tool the admin panel uses |

Prisma is not used: the repository had no existing Prisma setup, and the spec said to use Prisma only if it already existed.

## Source layout

```
src/
  index.ts                 process entry: config → deps → app → listen, cleanup job, graceful shutdown
  app/
    config.ts              env parsing/validation (Zod) → typed AppConfig
    server.ts              buildApp(): plugins, guards, route registration (no listen; testable)
    container.ts           composition root: repositories → services
  lib/                     framework-agnostic infrastructure
    db.ts                  postgres.js pool, transactions, Executor type, setClause helper
    errors.ts              AppError + constraint-violation translation
    imagekit.ts            minimal ImageKit REST client (sign, verify, delete)
    auth/token-verifier.ts Supabase JWT verification (JWKS / HS256)
    pagination.ts, money.ts, logger.ts
  middleware/auth.ts       requireAuth() / requireAdmin(role) guards
  plugins/                 error handler, security (helmet/cors/rate-limit/compress), OpenAPI
  schemas/common.ts        shared Zod pieces: pagination, envelopes, error schema
  types/fastify.d.ts       request.auth / request.admin / app.guards typings
  utils/http.ts            ok(), paginated(), cache headers
  modules/<feature>/
    <feature>.routes.ts      URL + guard + Zod schema → controller call
    <feature>.controller.ts  HTTP ↔ service translation, DTO mapping, cache headers
    <feature>.service.ts     business rules, transactions
    <feature>.repository.ts  SQL only
    <feature>.schemas.ts     request/response contracts
    <feature>.types.ts       domain types
db/migrations/             ordered SQL migrations (source of truth for the schema)
scripts/                   migrate, seed, create-admin, cleanup-assets
tests/                     unit/HTTP tests; tests/integration runs against real Postgres
```

### Request flow

```
HTTP request
  → onRequest: rate limit, CORS, requireAuth/requireAdmin (guards run BEFORE body parsing/validation)
  → Zod validation of params / query / body   (fails → 422 VALIDATION_ERROR)
  → route handler → controller → service → repository(SQL)
  → controller maps records → DTO, wraps in { data } / { data, pagination }
  → Zod response serializer (drops any field not in the response schema)
  → compression, security headers, X-Request-Id
```

Errors thrown anywhere go through one error handler ([api-architecture.md](./api-architecture.md#errors)).

### Layer rules

- **Routes** declare the URL, guard, and schemas. No logic.
- **Controllers** do no business logic. They call services and map results to DTOs.
- **Services** own business rules and transaction boundaries. They depend on repository *interfaces*, so tests swap in fakes.
- **Repositories** contain SQL only. Each function takes an `Executor` (pool or transaction) as its first argument.
- Modules may import another module's repository or mapper when they need read access (the dashboard uses the orders repository). They do not call each other's routes.

## Cross-cutting documents

- [Authentication & authorization](./authentication.md)
- [Database](./database.md)
- [API conventions, errors, security, caching](./api-architecture.md)
- [Image management (ImageKit)](./image-management.md)
- [Architecture decisions](../decisions/README.md)
