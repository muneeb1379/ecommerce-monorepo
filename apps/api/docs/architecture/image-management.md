# Image Management (ImageKit)

Decision record: [ADR 005](../decisions/005-imagekit-direct-upload-and-deletion-outbox.md). Endpoints: [features/uploads/api.md](../features/uploads/api.md), [features/products/api.md](../features/products/api.md#images).

## Principles

1. **Bytes never pass through the API.** Browsers upload directly to ImageKit. The API only signs uploads and stores metadata.
2. **The ImageKit private key never leaves the server.** It signs upload tokens and authenticates management calls.
3. **The database never points at a deleted file.** Rows are removed before assets, and asset deletion is retried until it succeeds.

## Upload lifecycle

```
Admin dashboard                         API server                              ImageKit
───────────────                         ──────────                              ────────
1. GET /api/admin/uploads/imagekit-auth ─►
                                        2. requireAdmin('admin')
                                           token = uuid, expire = now + 30 min
                                           signature = HMAC-SHA1(privateKey, token + expire)
   ◄─ { token, expire, signature,
        publicKey, urlEndpoint, folder }  3.
4. POST https://upload.imagekit.io/api/v1/files/upload
   (file, fileName, publicKey, signature, expire, token, folder, useUniqueFileName=true) ──────────────►
   ◄──────────────────────────────────────────────────────────── 5. { fileId, url, thumbnailUrl, … }
6. POST /api/admin/products/:id/colors/:colorId/images
   { imageUrl: url, imageKitFileId: fileId, alt?, isPrimary? } ─►
                                        7. Validate:
                                           - body schema (https URL, ids, lengths)
                                           - URL starts with IMAGEKIT_URL_ENDPOINT
                                           - (IMAGEKIT_VERIFY_UPLOADS) GET /v1/files/:fileId/details ─►
                                             file exists and its URL matches   ◄─
                                        8. Transaction: lock product, check color belongs to product,
                                           insert product_images (sort order, primary state)
   ◄─ 201 { data: image }
```

- Signatures are single-use in practice (each has a random token) and expire after 30 minutes (ImageKit caps expiry at 1 hour). They are served with `Cache-Control: no-store`. Request a fresh one per upload.
- Colors and images can also be created in bulk: `POST /api/admin/products` (new product with `colors[].images[]`) and `PATCH /api/admin/products/:id` with `colors` (full sync). Both run the same validation for every new image, **before** the transaction opens, so no DB locks are held during ImageKit calls.
- Verification (step 7) stops a client from registering a URL it doesn't own or pairing a URL with someone else's file id. The URL stored is the canonical one ImageKit returns. It adds one ImageKit API call per new image; set `IMAGEKIT_VERIFY_UPLOADS=false` only for local development without ImageKit access.
- `imagekit_file_id` is unique, so one file cannot be attached to two images (409).

### Thumbnails

The API stores the original URL and derives `thumbUrl` on output with an ImageKit URL transformation (`?tr=w-400,h-400,c-at_max`). The storefront can use other transformations (e.g. `tr=w-1200`) on `url` directly. The transformation lives in `createImageKitClient().thumbnailUrl()`.

## Deletion lifecycle

Applies to deleting an image, a color (all its images), a product (all its images), and images dropped during a `PATCH … colors` sync.

```
1. Validate authorization (requireAdmin('admin')).
2. Transaction:
     lock product row
     check business rules (e.g. a published product keeps ≥ 1 image per color)
     DELETE image rows  (cascade for colors/products)
     promote a new primary image if the primary was deleted
     INSERT file ids INTO pending_asset_deletions        ← the "outbox", same transaction
   COMMIT
3. After commit (best effort, inside the request):
     claim those queue rows (lease), call ImageKit DELETE /v1/files/:fileId
     success or 404 → delete the queue row
     failure        → attempts++, last_error, next_attempt_at = now + backoff
4. Respond 204 (the request does NOT fail if step 3 fails).
5. Background retry: every ASSET_CLEANUP_INTERVAL_MS (default 5 min) each API instance processes
   due rows (FOR UPDATE SKIP LOCKED). `npm run assets:cleanup` does the same on demand or from cron.
```

### Failure analysis

| Failure point | Result | Recovery |
| --- | --- | --- |
| Transaction fails (step 2) | Nothing changed: rows, queue, and ImageKit are all untouched | Client retries |
| ImageKit delete fails / times out (step 3) | Rows gone, file remains in ImageKit, queue row kept | Retried with exponential backoff (1 min, 2 min, 4 min … max 6 h) until it succeeds |
| Process crashes between commit and step 3 | Same as above | Periodic job picks it up |
| File already deleted in ImageKit | ImageKit 404 is treated as success | — |
| Image already deleted in DB | `DELETE …/images/:imageId` returns 204 (idempotent) if the product and color exist | — |

There is no failure mode where a row references a deleted asset. The worst case is a file in ImageKit that nothing references, which the queue removes eventually.

Monitor `pending_asset_deletions` for rows with high `attempts`; `last_error` holds the latest failure.

### Uploaded but never registered

If an upload succeeds (step 5) but step 6 never happens (tab closed, validation failed), the file is orphaned in ImageKit. The API cannot know about it. See [uploads known limitations](../features/uploads/README.md#known-limitations).

## Frontend guidance: instant color switching

The storefront product response already contains every color with every image ([ADR 001](../decisions/001-product-color-image-model.md)). To make switching feel instant:

- Render the selected color's images from memory; never refetch on color change.
- After first paint, preload the other colors' primary images (and optionally the rest): `new Image().src = url`, or `<link rel="preload" as="image">` for the likely next pick.
- Use `thumbUrl` (or a `tr=` transformation of `url`) for swatch thumbnails and galleries; request full-size only for the main image.
