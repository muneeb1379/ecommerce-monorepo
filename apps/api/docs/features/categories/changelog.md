# Categories Changelog

## 2026-09-23

### Added

- `categories` table (migration `0001_initial_schema`).
- Admin CRUD under `/api/admin/categories`, storefront list `GET /api/store/categories`.

### Fixed

- Deleting a category in use returned 500: Postgres reports `ON DELETE RESTRICT` as SQLSTATE `23001`, not `23503`. Both now map to `409 CONFLICT`. Found by the real-database integration suite before release.

### Developer Notes

- Products reference categories by `categoryId` (uuid). The admin panel previously assumed category *names* as strings ([integration notes](../../architecture/api-architecture.md#admin-dashboard-integration-notes)).
