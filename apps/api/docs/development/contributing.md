# Contributing

Documentation is part of the implementation. A change is not done until code, tests, and docs agree.

## Feature development workflow

1. **Define**: create or update `docs/features/<feature>/README.md`: purpose, scope, acceptance criteria, dependencies, and `Status: In Progress`.
2. **Design the data**: if tables change, write the migration and update `docs/features/<feature>/database.md` (and [architecture/database.md](../architecture/database.md) for new tables/relationships).
3. **Define the contract**: update `docs/features/<feature>/api.md`, then write the Zod schemas in `<feature>.schemas.ts` (request **and** response).
4. **Implement**: routes → controller → service → repository, following the [layer rules](../architecture/overview.md#layer-rules). Add tests.
5. **Verify**: `npm run verify` (typecheck, lint, tests, build). If SQL changed, also run `npm run test:integration`.
6. **Update docs**: README (status, rules, limitations), api.md, database.md, a new changelog entry, and an ADR if an architectural decision was made.
7. **Set the status honestly**: `Complete` only when the acceptance criteria, tests, and docs are all done. Use `Planned`, `In Progress`, `Complete`, `Deprecated`, or `Blocked`, and update the table in [docs/README.md](../README.md).

### Does this change affect documentation?

| If you… | Update |
| --- | --- |
| add/change/remove an endpoint, field, query param, or error code | feature `api.md` (+ `api-architecture.md` for new error codes) |
| change a table, column, index, constraint, or cascade | migration + feature `database.md` (+ `architecture/database.md`) |
| change a business rule | feature `README.md` → Business Rules |
| fix or introduce a limitation | feature `README.md` → Known Limitations |
| add a dependency or env var | feature `README.md` → Dependencies; `environment.md`; root `.env.example` |
| change behaviour in any way | a new dated entry in the feature `changelog.md` |
| make or reverse an architectural decision | a new ADR in `docs/decisions/` (never rewrite an accepted one) |
| change permissions | the matrix in `architecture/authentication.md` |

## Changelog entries

Add a new dated section at the top of `docs/features/<feature>/changelog.md`. Never edit or delete past entries. Every entry should answer:

- **What** changed (Added / Changed / Fixed / Removed / Deprecated)
- **Why**
- **Which API** changed (endpoints, fields)
- **Which database structures** changed (migration name)
- **Frontend impact**: does the admin dashboard or storefront need changes?
- **Migration requirements / backward compatibility**

Use `### Technical Notes`, `### Developer Notes`, and `### Migration / Compatibility` subsections as needed. Mirror notable entries in "Recent Changes" in [docs/README.md](../README.md).

## Branches & commits

- Branch from `main`: `feat/<feature>-<short-desc>`, `fix/<short-desc>`, `docs/<short-desc>`.
- Keep a branch to one feature or fix; include its docs in the same branch.
- Commit messages: imperative summary (`Add color reordering endpoint`), with the body explaining *why*.
- `npm run verify` must pass before merging.

## Testing requirements

- Every business rule has a test. Every endpoint has at least: happy path, auth (401/403), and validation failure.
- **Unit/HTTP tests** (`tests/*.test.ts`): build the app with `buildTestApp()` (mocked repositories, fake token verifier and ImageKit) and use `app.inject()`. Services can be tested directly with `mockRepository(...)`.
- **Integration tests** (`tests/integration`): required for new or changed SQL. They run real repositories against Postgres ([setup](./setup.md#integration-tests)).
- Test authorization from the attacker's side: send forged roles/ids in body and headers and assert they're ignored.
- Never hit real Supabase or ImageKit from tests.

## Migrations

- Add a new file `db/migrations/NNNN_description.sql` (next number, zero-padded). **Never edit a migration that has been applied anywhere shared.**
- Each migration runs in one transaction. Write it to be correct on an empty and on a populated database (backfill before adding `NOT NULL`).
- **Every new table must**:
  1. `alter table … enable row level security;` (no policies)
  2. `revoke all on table … from anon, authenticated;` (guarded as in `0001`)
  3. get indexes for its foreign keys and common filters
  4. use `timestamptz`, `numeric(12,2)` for money, and the `set_updated_at` trigger if it has `updated_at`
- Prefer additive changes. For renames/removals: add new → deploy code that uses both → backfill → remove old in a later migration.
- Document meaningful behaviour changes in the feature's `database.md` and changelog, and add the migration to the table in [architecture/database.md](../architecture/database.md#migrations).
- Deploy order: migrate first, then release code.

## API change rules

The admin dashboard and storefront are deployed independently, so the contract must stay stable.

- **Non-breaking (allowed any time)**: new endpoints, new optional request fields, new response fields, new error codes on new failure modes, new enum values in *requests*.
- **Breaking (needs coordination)**: removing or renaming fields/endpoints, changing types or meaning, making optional inputs required, new enum values in *responses* the frontends switch on, tighter validation of existing inputs.
- Breaking changes need one of: a coordinated release with both frontends; a new path (`/api/v2/...` for the affected routes) with a deprecation period for the old one; or an additive replacement field, deprecating the old one first.
- Every contract change updates the feature `api.md` and changelog **in the same change**, including a "Frontend impact" note.
- Never expose new internal data on `/api/store/*` without checking it belongs in a public response (public DTOs are separate schemas for this reason).

## Code conventions

- TypeScript strict, ESM (`.js` extensions in imports), `import type` for types.
- SQL lives only in `*.repository.ts`, and is always parameterised with tagged templates. Dynamic `ORDER BY` uses whitelisted fragments. Never build SQL from strings.
- Services throw `AppError` helpers (`notFound`, `businessRule`, …). Never send responses from services.
- Money: compute in integer cents (`toCents`/`fromCents`).
- No network calls to external services while a DB transaction is open.
