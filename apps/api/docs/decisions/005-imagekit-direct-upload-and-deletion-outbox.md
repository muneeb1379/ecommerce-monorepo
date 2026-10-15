# 005. Direct ImageKit Uploads and a Transactional Outbox for Asset Deletion

## Status

Accepted

## Context

Product images live in ImageKit. Proxying uploads through the API would cost bandwidth, memory, and latency, and would tie request timeouts to file sizes. Deleting an image touches two systems (Postgres and ImageKit) that cannot share a transaction. We must never leave a database row pointing at a deleted file, and should not leak files either.

## Decision

1. **Direct browser uploads.** The API signs short-lived upload credentials (`HMAC-SHA1(privateKey, token + expire)`, 30-minute expiry) at `GET /api/admin/uploads/imagekit-auth`. The browser uploads straight to ImageKit, then registers `{ imageUrl, imageKitFileId }` with the API.
2. **Verify before storing.** The URL must be on our `IMAGEKIT_URL_ENDPOINT`. With `IMAGEKIT_VERIFY_UPLOADS` (default on) the API looks the file up in ImageKit and requires the URL to match. Verification happens before the DB transaction opens.
3. **Delete DB first, then ImageKit, via an outbox.** The transaction that deletes image rows also inserts their file ids into `pending_asset_deletions`. After commit, the API attempts the ImageKit deletions immediately. Failures stay queued with exponential backoff and are retried by an in-process interval job (every API instance, `SKIP LOCKED` leases) and by `npm run assets:cleanup`. ImageKit 404 counts as success, which makes retries idempotent.
4. **No ImageKit SDK.** We need three calls (sign, get details, delete), implemented in ~100 lines with `fetch` and timeouts.

## Alternatives Considered

- **Upload through the API (multipart).** Simpler client, but the API would carry every byte. Rejected by the requirements.
- **Delete from ImageKit first, then the DB row.** If the DB delete fails afterwards, the row points at a missing file. That is exactly what must not happen.
- **Delete both in the request without a queue.** Any ImageKit hiccup would either fail the admin's request after the DB change, or silently leak files.
- **ImageKit webhooks to reconcile.** More infrastructure, and it doesn't solve the ordering problem.

## Consequences

- After a failed ImageKit deletion, a file can outlive its row for a while. That is harmless (nothing references it) and bounded by the retry schedule.
- Files uploaded but never registered (abandoned forms) are not tracked. A periodic reconciliation against the upload folder is listed as future work.
- Each new image costs one ImageKit API call during registration. Bulk product saves verify with a concurrency of 5.
- The `folder` returned by the auth endpoint is advisory. ImageKit does not bind the signature to a folder, so the server checks the URL endpoint, not the folder.

## Date

2026-09-23
