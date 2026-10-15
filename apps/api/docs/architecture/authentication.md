# Authentication & Authorization

Decision record: [ADR 004](../decisions/004-supabase-jwt-verification.md).

## Summary

- **Authentication** (who are you?) uses Supabase Auth. The frontend signs in with Supabase and sends the **access token** as `Authorization: Bearer <token>`. The API verifies the token itself.
- **Authorization** (what may you do?) comes from the `admin_profiles` table. A valid Supabase session alone grants nothing.
- There is **no registration endpoint**, no email verification, and no storefront customer login. Users are created manually.

## Sign-in flow (admin dashboard)

```
1. Admin enters email + password in the dashboard.
2. Dashboard → Supabase Auth: signInWithPassword()  →  session { access_token, refresh_token }
3. Dashboard → API: GET /api/auth/me   Authorization: Bearer <access_token>
4. API verifies the JWT (signature, issuer, audience, expiry)      → 401 if invalid
5. API loads admin_profiles WHERE id = token.sub AND is_active     → 403 if missing/inactive
6. API returns the profile { id, email, fullName, role, ... }.  The dashboard shows UI for that role.
7. Every later request repeats steps 4–5 server-side. The dashboard hiding pages is cosmetic, not security.
8. supabase-js refreshes the access token automatically; the API only ever sees access tokens.
```

A 401 from the API means the token is missing, invalid, or expired: the dashboard should sign out or refresh. A 403 means the user is signed in but is not an (active) admin, or lacks the role for that action.

## Token verification (`src/lib/auth/token-verifier.ts`)

| Check | Rule |
| --- | --- |
| Header format | Exactly `Bearer <header>.<payload>.<signature>` (case-insensitive scheme, max 8 KB) |
| Signature (asymmetric) | `ES256`/`RS256` against `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`. Keys are cached for 10 min and refetched on an unknown `kid` (30 s cooldown) |
| Signature (legacy) | `HS256` with `SUPABASE_JWT_SECRET`, **only if that variable is set**. Otherwise HS256 tokens are rejected |
| Issuer | `${SUPABASE_URL}/auth/v1` |
| Audience | `authenticated` |
| Expiry | enforced, 5 s clock tolerance |
| Claims | `sub` required; `role` must be `authenticated`; anonymous-sign-in tokens (`is_anonymous: true`) are rejected |

The verified `sub` (Supabase user id) is the **only** identity the API uses. It is stored on `request.auth`.

### What is never trusted

- User ids, roles, or emails in the request body, query, or custom headers. Tests assert that `x-admin-role`, `x-user-id`, and body `role`/`userId`/`changedBy` are ignored.
- The frontend's route protection.
- Any `Authorization` value that is not a verifiable Supabase access token.

## Authorization (`src/middleware/auth.ts`, `src/modules/auth/permissions.ts`)

Guards are attached per route as `onRequest` hooks. They run **before** body parsing and validation, so unauthenticated callers get 401 and learn nothing about validation rules.

```ts
app.get('/x',    { onRequest: app.guards.requireAuth() }, handler)        // any valid Supabase user
app.get('/y',    { onRequest: app.guards.requireAdmin() }, handler)       // any active admin (staff+)
app.post('/z',   { onRequest: app.guards.requireAdmin('admin') }, handler) // admin or owner
```

`requireAdmin` reads `admin_profiles` on every request (a primary-key lookup). **Deactivating an admin or changing their role takes effect on their next request**, without waiting for the JWT to expire.

### Roles

One role per admin, ordered `staff < admin < owner`:

| Role | Intended for |
| --- | --- |
| `staff` | Operations: read catalog, orders, customers, dashboard; change order status |
| `admin` | Everything `staff` can do, plus manage the catalog: products, colors, images, categories, upload signing |
| `owner` | Everything. Reserved for future account-level features (e.g. managing admins through the API) |

### Endpoint access matrix

| Endpoint | Guard |
| --- | --- |
| `GET /api/auth/me` | staff |
| `GET /api/products`, `GET /api/products/:id` | staff |
| `POST/PATCH/DELETE /api/admin/products/**` (incl. colors, images) | admin |
| `GET /api/admin/categories[/:id]` | staff |
| `POST/PATCH/DELETE /api/admin/categories[/:id]` | admin |
| `GET /api/admin/orders[/:id][/items]`, `PATCH /api/admin/orders/:id/status` | staff |
| `GET /api/admin/customers[/:id]` | staff |
| `GET /api/admin/dashboard` | staff |
| `GET /api/admin/uploads/imagekit-auth` | admin |
| `/api/store/**`, `/health/**` | public |

### Adding a permission

1. Choose the minimum role and pass it to `app.guards.requireAdmin('<role>')` on the route.
2. Update the matrix above and the feature's `api.md`.
3. Add a test that the next-lower role gets 403.

If a future need does not fit a strict hierarchy (e.g. "staff may refund but not edit products"), replace `hasRole()` in `permissions.ts` with a role → permission map and change `requireAdmin` to take a permission name. Routes only depend on the guard's signature, so that change stays local.

## Managing admins

Users are created manually. There is no public sign-up.

1. In the Supabase dashboard: **Authentication → Users → Add user**. Enter an email and password, and tick **Auto Confirm User** (no email verification).
2. Grant dashboard access:
   ```bash
   npm run admin:create -- --email jane@example.com --role admin --name "Jane Doe"
   ```
3. To revoke access: `npm run admin:create -- --email jane@example.com --deactivate` (or delete the user in Supabase; the profile cascades).

Recommended Supabase settings: disable public sign-ups (**Authentication → Providers → Email → "Allow new users to sign up" off**) and anonymous sign-ins.

## Known limitations

- Access tokens are stateless. A signed-out session's token stays cryptographically valid until it expires (Supabase default: 1 hour). Revoking an admin via `is_active` takes effect immediately; revoking only the Supabase session does not.
- If the JWKS endpoint is unreachable and no keys are cached, token verification fails and returns 500 (server-side problem, logged).
- Storefront customer accounts are not implemented (`customers.auth_user_id` is reserved for them).
