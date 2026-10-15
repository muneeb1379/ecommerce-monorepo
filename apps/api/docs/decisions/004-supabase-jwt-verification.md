# 004. Local Supabase JWT Verification and Database-Backed Admin Roles

## Status

Accepted

## Context

The dashboard signs in with Supabase Auth and sends the access token to the API. The API must reject forged or expired tokens and decide what each user may do, without trusting anything the frontend claims. Users are created manually; there is no registration.

## Decision

1. **Verify tokens locally** with `jose`:
   - asymmetric tokens (Supabase JWT signing keys, `ES256`/`RS256`) against the project's JWKS endpoint, with keys cached
   - legacy `HS256` tokens only when `SUPABASE_JWT_SECRET` is configured
   - issuer, audience (`authenticated`), expiry, `role = authenticated`, and non-anonymous are always enforced
2. **Authorize from the database.** `admin_profiles(id = auth.users.id, role, is_active)` is the source of truth. `requireAdmin(minRole)` loads it on every request and compares roles on a simple hierarchy `staff < admin < owner`.
3. Guards run as Fastify **`onRequest`** hooks, before body parsing and validation.
4. Identity is only ever `token.sub`. No request field can influence identity or role.

## Alternatives Considered

- **Call Supabase `auth.getUser(token)` on every request.** This also detects revoked sessions, but adds a network round trip and an availability dependency to every request. Rejected; local verification plus DB-backed `is_active` covers the revocation that matters (removing admin access).
- **Put the role in JWT custom claims (Supabase auth hook).** No DB lookup, but role changes wait for token expiry, and the claim setup lives outside this codebase. A primary-key lookup per request is cheap.
- **Full RBAC (roles × permissions tables).** More flexible, but not needed. The guard signature allows swapping in a permission map later without touching routes.

## Consequences

- One extra indexed query per admin request.
- Signing out in Supabase does not invalidate an already-issued access token until it expires (default 1 hour). Deactivating the admin profile does take effect immediately.
- The JWKS endpoint must be reachable at least once per key rotation. Verification errors caused by network failures surface as 500 and are logged, not as 401.
- Supabase projects still on the legacy JWT secret must set `SUPABASE_JWT_SECRET`. Projects on signing keys don't need any secret in the API.

## Date

2026-09-23
