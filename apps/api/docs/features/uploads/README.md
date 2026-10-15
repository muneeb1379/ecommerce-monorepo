# Uploads

## Purpose

Lets the admin dashboard upload product images **directly to ImageKit** without exposing the private key, and makes sure ImageKit assets are removed when their database rows are deleted.

Full lifecycle: [architecture/image-management.md](../../architecture/image-management.md). Decision: [ADR 005](../../decisions/005-imagekit-direct-upload-and-deletion-outbox.md).

## Status

**Status: Complete**

Completed:

- `GET /api/admin/uploads/imagekit-auth` (signed, 30-minute upload credentials)
- Upload metadata validation (`UploadsService.validateImages`): endpoint check plus optional ImageKit file verification
- Deletion outbox (`pending_asset_deletions`), immediate post-commit deletion, retry with exponential backoff, in-process job and `npm run assets:cleanup`
- Tests (signature algorithm, no private key in responses, role enforcement, failure keeps queue row, 404 = deleted)

Pending: none within scope.

## Responsibilities

- `src/lib/imagekit.ts`: ImageKit REST client (sign, file details, delete, thumbnail URL)
- `src/modules/uploads/*`: auth endpoint, validation service, cleanup service/repository
- Table `pending_asset_deletions`

## Dependencies

- ImageKit account (public key, private key, URL endpoint)
- Auth (`admin`+ for signing)
- Products module (calls validation and cleanup)

## Business Rules

- The private key is never returned or logged. Only `token`, `expire`, `signature`, `publicKey`, `urlEndpoint`, and `folder` are returned.
- Registered image URLs must be on `IMAGEKIT_URL_ENDPOINT`. With `IMAGEKIT_VERIFY_UPLOADS=true` (default) the file must exist in ImageKit and its URL must match.
- Database rows are deleted before ImageKit assets. Failed asset deletions are retried until they succeed, and ImageKit 404 counts as success.

## API

See [api.md](./api.md).

## Database

`pending_asset_deletions`:

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `imagekit_file_id` | text | unique |
| `attempts` | integer | failed attempts so far |
| `last_error` | text | latest failure message (≤ 500 chars) |
| `next_attempt_at` | timestamptz | due time; also used as a processing lease (+120 s) |
| `created_at` | timestamptz | |

Index: `(next_attempt_at)`. Rows are inserted in the same transaction that deletes image rows. They are deleted when the ImageKit deletion succeeds.

## Known Limitations

- Files uploaded to ImageKit but never registered (abandoned forms) are not tracked and stay in ImageKit.
- The `folder` in the auth response is advisory; ImageKit does not bind signatures to a folder.
- No alerting on rows that keep failing; monitor `attempts` / `last_error`.

## Future Work

- Periodic reconciliation: list files in the upload folder older than N hours that no `product_images` row references, then delete them
- Metrics or alerts for the deletion queue
