# Auth API

## Authentication header

Every admin endpoint requires:

```
Authorization: Bearer <Supabase access token>
```

Obtain the token in the frontend with `supabase.auth.getSession()` (after `signInWithPassword`). Always send the **access token**, never the refresh token.

| Situation | Response |
| --- | --- |
| Header missing or not `Bearer <jwt>` | `401 UNAUTHENTICATED` "Missing or malformed Authorization header" |
| Bad signature / wrong issuer or audience / anonymous user | `401 UNAUTHENTICATED` "Invalid token" (or a more specific message) |
| Expired | `401 UNAUTHENTICATED` "Token expired": refresh the session and retry |
| Valid user without an active admin profile | `403 FORBIDDEN` "This account does not have admin access" |
| Admin whose role is below the route's minimum | `403 FORBIDDEN` "This action requires the admin role" |

## GET /api/auth/me

Returns the caller's admin profile. The dashboard calls it after sign-in to decide whether to let the user in and which actions to show.

Auth: any active admin (`staff`+).

Response `200`:

```json
{
  "data": {
    "id": "9b1d…",
    "email": "jane@example.com",
    "fullName": "Jane Doe",
    "role": "admin",
    "avatarUrl": null,
    "createdAt": "2026-09-23T10:00:00.000Z"
  }
}
```

`role` is `owner | admin | staff`. Errors: `401`, `403` as above.
