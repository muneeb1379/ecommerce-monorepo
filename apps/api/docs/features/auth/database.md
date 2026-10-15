# Auth — Database

## `admin_profiles`

Grants dashboard access to a Supabase Auth user. No row → no admin access.

| Column | Type | Constraints / default | Notes |
| --- | --- | --- | --- |
| `id` | uuid | PK, FK → `auth.users.id` **ON DELETE CASCADE** | same id as the Supabase user (`sub` claim) |
| `email` | text | not null; unique on `lower(email)` | copied from `auth.users` by `admin:create` |
| `full_name` | text | not null, default `''` | shown in order history ("changed by") |
| `role` | `admin_role` | not null, default `staff` | `owner` \| `admin` \| `staff` |
| `avatar_url` | text | null | |
| `is_active` | boolean | not null, default true | `false` revokes access immediately |
| `created_at`, `updated_at` | timestamptz | | |

- Read on every admin request by primary key (`findAdminProfileById`).
- Written only by `scripts/create-admin.ts` (no API writes yet).
- Deleting the Supabase user deletes the profile. `order_status_history.changed_by` becomes null.
- RLS enabled, no policies; `anon`/`authenticated` have no privileges.

`auth.users` is managed by Supabase and is only read (by the admin script and the FK).
