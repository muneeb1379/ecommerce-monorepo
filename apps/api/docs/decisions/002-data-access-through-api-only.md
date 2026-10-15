# 002. The API Is the Only Database Client; SQL via postgres.js

## Status

Accepted

## Context

Supabase makes it easy for frontends to query tables directly (PostgREST via `supabase-js`). The requirement is the opposite: the admin dashboard and the storefront must go through this API, so business rules (pricing, publishing, stock, authorization) live in one place and the frontends can evolve independently.

We also needed a database access approach. The repository had no existing Prisma or Supabase client setup. The requirements call for multi-statement transactions, row locks (`SELECT … FOR UPDATE`), database-side aggregation, and one-query nested responses.

## Decision

1. **Enforce API-only access in the database**, not just by convention. Migration `0001` enables RLS on every table with **no policies** and revokes all privileges from Supabase's `anon` and `authenticated` roles. A frontend holding the anon key and a user session gets *permission denied* from PostgREST.
2. The API connects with `DATABASE_URL` as the Supabase `postgres` role (bypasses RLS) through the Supabase connection pooler.
3. **Data access uses `postgres` (postgres.js) with hand-written, parameterised SQL** in per-module repository files:
   - real transactions (`sql.begin`), row locks, `SKIP LOCKED`
   - nested JSON aggregation for product → colors → images in one round trip
   - `FILTER` aggregates for the dashboard
   - snake_case ⇄ camelCase column mapping; `prepare: false` for the transaction pooler
4. The Supabase **service role key is not used** by the server at runtime (it is accepted in the environment only so a shared `.env` validates). Auth needs only the public JWKS ([ADR 004](./004-supabase-jwt-verification.md)).

## Alternatives Considered

- **`supabase-js` with the service role key (PostgREST).** No multi-statement transactions from the client (they would need a Postgres function per operation), no row locks, and nested ordering/aggregation are awkward. Service-role keys in app servers are also a large blast radius.
- **Prisma.** The spec said to use it only if the project already did, and it didn't. It would add a codegen step and a query engine. Its interactive transactions and nested writes work, but `FOR UPDATE`, `SKIP LOCKED`, `json_agg`, and `FILTER` aggregates would need raw SQL anyway.
- **Kysely / Drizzle (typed query builders).** Reasonable choices. They were rejected to keep dependencies and abstraction minimal; the SQL surface is small and fully covered by an integration test suite against real Postgres.
- **RLS policies instead of revoking access.** Useful if frontends ever need direct reads, but that contradicts the architecture. "No policies + no grants" is simpler to audit.

## Consequences

- Row types are declared by hand next to each query. A column rename needs the query and the type updated together; the integration suite (`npm run test:integration`) catches drift.
- **Every new table** must enable RLS and revoke `anon`/`authenticated` privileges in its migration (in the migration checklist in [contributing.md](../development/contributing.md#migrations)).
- Supabase features built on PostgREST/Realtime cannot be used by the frontends for these tables. Anything like that must be exposed through the API.
- Services control transaction boundaries explicitly. Repository functions take the executor to run on, which keeps them composable and easy to fake in unit tests.

## Date

2026-09-23
