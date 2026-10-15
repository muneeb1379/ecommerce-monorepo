# Uploads Changelog

## 2026-09-23

### Added

- `GET /api/admin/uploads/imagekit-auth` (the admin panel previously assumed `GET /imagekit/auth`; the response adds `folder`).
- ImageKit upload verification on image registration (`IMAGEKIT_VERIFY_UPLOADS`).
- `pending_asset_deletions` outbox, post-commit deletion, background retry job (`ASSET_CLEANUP_INTERVAL_MS`), and `npm run assets:cleanup`.

### Technical Notes

- ImageKit is called over its REST API with `fetch` and 10 s timeouts; no SDK dependency.
