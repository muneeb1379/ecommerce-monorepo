# Auth

## Purpose

Verifies Supabase Auth access tokens and decides whether the caller is an active admin with a sufficient role. It provides the route guards every admin endpoint uses, and `GET /api/auth/me` for the dashboard.

Full flow and rules: [architecture/authentication.md](../../architecture/authentication.md). Decision: [ADR 004](../../decisions/004-supabase-jwt-verification.md).

## Status

**Status: Complete**

Completed:

- JWT verification (JWKS ES256/RS256; optional legacy HS256), with issuer/audience/expiry/role/anonymous checks
- `requireAuth()` / `requireAdmin(minRole)` guards as `onRequest` hooks
- Role hierarchy `staff < admin < owner`, loaded from `admin_profiles` per request
- `GET /api/auth/me`
- `npm run admin:create` for granting, changing, and revoking admin access
- Tests: header parsing, invalid/forged/expired/anonymous tokens, missing/inactive profile, role enforcement, ignoring client-supplied identity

Pending: none within scope. See Future Work.

## Responsibilities

- `src/lib/auth/token-verifier.ts`: token verification
- `src/middleware/auth.ts`: guards, bearer parsing
- `src/modules/auth/*`: admin profile lookup, role checks, `/me`
- Table `admin_profiles` ([database.md](./database.md))

## Dependencies

- Supabase Auth (JWKS endpoint; users in `auth.users`)
- Supabase Postgres (`admin_profiles`)

## Business Rules

- No public registration and no email verification. Users are created manually in Supabase, then granted access with `admin:create`.
- Identity = verified `sub` only. Roles come only from `admin_profiles`. Request bodies, queries, and custom headers never influence identity or role.
- Inactive or missing profile → 403 on every admin endpoint, effective immediately.
- Guards run before validation, so unauthenticated requests always get 401.

## API

See [api.md](./api.md).

## Database

See [database.md](./database.md).

## Known Limitations

- Stateless tokens remain valid until expiry after a Supabase sign-out (use `--deactivate` to cut access immediately).
- No API for managing admins; the CLI script is the interface.

## Future Work

- Owner-only admin management endpoints (`/api/admin/admins`)
- Storefront customer accounts (`customers.auth_user_id`)
- Optional permission map if roles stop fitting a hierarchy
