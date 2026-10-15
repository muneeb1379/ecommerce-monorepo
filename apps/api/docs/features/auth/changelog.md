# Auth Changelog

## 2026-09-23

### Added

- Supabase access-token verification (JWKS for ES256/RS256; HS256 when `SUPABASE_JWT_SECRET` is set).
- `requireAuth()` / `requireAdmin(minRole)` guards; role hierarchy `staff < admin < owner`.
- `admin_profiles` table (migration `0001_initial_schema`).
- `GET /api/auth/me`.
- `npm run admin:create` script.

### Technical Notes

- Guards are `onRequest` hooks, so authentication happens before body validation. Anonymous callers never see validation errors.
- The admin profile is read on every request, so deactivation and role changes take effect immediately.

### Migration / Compatibility

- New table. Existing Supabase users need `admin:create` before they can use the dashboard.
