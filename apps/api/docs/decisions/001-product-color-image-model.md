# 001. Product Color Image Model

## Status

Accepted

## Context

Products come in colors (Black, White, Blue…), and each color has its own gallery. On the storefront, a shopper switching colors must see the new gallery **instantly**. If every switch triggered a request (`GET /products/:id/colors/:colorId`), the latency would be visible on every click, especially on mobile networks, and the server would take N extra requests per product view.

The admin dashboard needs to edit colors and images individually (add a color, upload an image to a color, reorder, set the primary image) and also save a whole product form at once.

## Decision

1. **Explicit three-level relational model**:
   ```
   products 1─N product_colors 1─N product_images
   ```
   - A color belongs to exactly one product (`product_colors.product_id`, cascade delete). Color names are unique per product, case-insensitively.
   - An image belongs to exactly one color (`product_images.product_color_id`, cascade delete).
   - Each color has at most one primary image (partial unique index). The service keeps exactly one primary whenever a color has images: the first uploaded image becomes primary, and deleting the primary promotes the next.
   - Ordering is explicit with `sort_order` on colors and images.
2. **One response carries everything.** `GET /api/store/products/:slug` (and the admin `GET /api/products/:id`) returns `product → colors[] → images[]`, built by **one SQL query** with nested `json_agg`, ordered by `sort_order`. There is intentionally **no** per-color endpoint on the storefront.
3. **Lists stay light.** Product lists return one `primaryImageUrl` plus color swatches (`id, name, hexValue`), not full galleries.
4. **Publishing rule.** A `published` product has at least one color, and every color has at least one image. This is enforced when publishing and on every mutation that could break it, so the storefront never shows an empty color.
5. Stock stays on the product, not per color (matches the current admin dashboard model).

## Alternatives Considered

- **Fetch images per color on selection.** Smaller first response, but a round trip on every switch. That is exactly the latency the requirement forbids.
- **Flat `product_images` with a `color` text column.** Simpler schema, but no place for color metadata (hex, order), weak integrity (typos create phantom colors), and no uniqueness guarantees.
- **Generic variants table (color × size × …) with per-variant SKU/stock/price.** More flexible, but more complex than any current requirement; the admin UI models colors only. It can be introduced later as `product_variants` referencing colors, without breaking this API (see Consequences).
- **Images as a JSON array column on colors.** Loses per-image constraints (unique ImageKit file id, one primary), and makes image-level deletes and cleanup awkward.

## Consequences

- Product detail payloads grow with image count. With the validation limits (≤ 30 colors × ≤ 20 images) the worst case is a few hundred KB uncompressed; typical products are a few KB, and responses are compressed and CDN-cacheable.
- The frontend is expected to preload other colors' images after first paint (guidance in [image-management.md](../architecture/image-management.md#frontend-guidance-instant-color-switching)).
- Product-level stock means you cannot sell out of one color only. Per-color stock would be a new `product_colors.stock` (or variants) column; the API can add an `inStock` flag per color additively.
- Every color/image mutation locks the product row, so edits to one product are serialised. Edits to different products do not contend.

## Date

2026-09-23
