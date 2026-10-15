# Products

## Purpose

Owns the catalog: products, their colors, and each color's images. Serves the admin dashboard (full CRUD) and the storefront (published products only, optimised for instant color switching).

## Status

**Status: Complete**

Completed:

- Product create (optionally with nested colors + images, one transaction), read, partial update, delete
- Full color/image set sync via `PATCH` (matches the admin product form)
- Color add / update / delete
- Image attach (after direct ImageKit upload) / update (alt, order, primary) / delete (idempotent)
- ImageKit metadata verification; ImageKit asset cleanup with retry queue
- Publish rule enforcement
- Admin list: pagination, search, category, status, sorting
- Storefront list (pagination, search, category slug, price range, sorting) and detail by slug, with nested colors → images in one response
- Unit, HTTP, and real-database integration tests

Pending (not part of the accepted scope):

- Bulk product import / export
- Product duplication
- Per-color stock and per-color SKU (variants)
- Reordering endpoint for many colors at once (possible today via `PATCH` with `colors`)

## Responsibilities

- Tables: `products`, `product_colors`, `product_images` ([database.md](./database.md))
- Business rules below
- Converting records to admin and storefront DTOs (`products.mapper.ts`)
- Queuing ImageKit assets for deletion when images, colors, or products are removed (with the uploads module)

Not owned here: categories (read for validation only), order snapshots (orders module), upload signing (uploads module).

## Dependencies

- **Auth**: admin reads need `staff`; writes need `admin`
- **Categories**: `categoryId` must exist; storefront filters by active category slug
- **Uploads / ImageKit**: `UploadsService.validateImages` (URL endpoint + file verification), `AssetCleanupService` (deletion outbox)
- **Supabase Postgres**

## Business Rules

- A product can have many colors; a color belongs to exactly one product.
- A color can have many images; an image belongs to exactly one color.
- Color names are unique per product (case-insensitive). Hex values are stored upper-case (`#RGB`/`#RRGGBB`).
- **Publishing**: a `published` product must have ≥ 1 color, and **every color must have ≥ 1 image**. Enforced:
  - on create with `status: published`
  - on `PATCH` that results in `published` (including a colors sync)
  - when adding a color to a published product (it must include images)
  - when deleting a published product's last color, or a color's last image (blocked with 422; unpublish first)
- **Primary image**: each color with images has exactly one primary.
  - first image of a color → primary automatically
  - `isPrimary: true` on add/update/sync → becomes the only primary
  - deleting the primary → next image by `sortOrder` is promoted
  - enforced in the DB by a partial unique index
- `compareAtPrice`, when set, must be greater than `price` (checked against stored values when only one side changes).
- Slugs and SKUs are unique (409 on conflict). Slug format: `lowercase-words-with-hyphens`.
- `publishedAt` is set the first time a product becomes published and kept afterwards.
- **Prices are controlled by the API.** Storefront prices come from `products.price`; checkout never trusts client prices ([orders](../orders/README.md)).
- Deleting a product removes its colors and images and queues their ImageKit files for deletion. Past orders keep their snapshot, and their `product_id` becomes null. Prefer **archiving** (`status: archived`) for products that have sold, to keep reporting links.
- The storefront only ever sees `published` products. `draft` and `archived` return 404 there.

## Performance notes

- Product detail (admin and storefront) is **one SQL query**: nested `json_agg` over colors and images, ordered by `sort_order`. No N+1.
- Lists fetch the page and the total count in parallel. Each row carries one primary image URL and color swatches, not galleries.
- Storefront responses are CDN-cacheable ([ADR 007](../../decisions/007-caching-strategy.md)).
- Search uses trigram GIN indexes on `name` and `sku`.

## API

See [api.md](./api.md).

## Database

See [database.md](./database.md). Design rationale: [ADR 001](../../decisions/001-product-color-image-model.md).

## Known Limitations

- Stock is per product, not per color.
- Product edits reach the storefront after up to `STORE_CACHE_MAX_AGE` seconds (CDN/browser caching).
- Renaming two colors to each other's names in one `PATCH` sync fails with 409 (names are unique per product and updated one at a time). Rename through a temporary name.
- An image cannot be moved between colors; delete and re-attach it.
- `GET /api/products` sits outside `/api/admin` for spec compatibility but is admin-only ([api-architecture.md](../../architecture/api-architecture.md#url-layout)).

## Future Work

- Variants (size × color) with per-variant SKU, price override, and stock
- Bulk import/export, product duplication
- Tag-based CDN invalidation on product writes
- Per-color `inStock` in storefront responses once per-color stock exists
