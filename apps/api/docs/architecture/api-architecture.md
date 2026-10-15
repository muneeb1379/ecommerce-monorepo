# API Architecture & Conventions

Decision record: [ADR 006](../decisions/006-api-contract-conventions.md). Machine-readable contract: OpenAPI at `/docs/json` (Swagger UI at `/docs`), enabled outside production.

## URL layout

| Prefix | Audience | Auth | Caching |
| --- | --- | --- | --- |
| `/api/store/*` | Public storefront | none | `public, max-age=STORE_CACHE_MAX_AGE` |
| `/api/auth/*` | Admin dashboard | admin | `no-store` |
| `/api/products`, `/api/products/:id` | Admin dashboard (product **reads**, all statuses) | admin (staff+) | `no-store` |
| `/api/admin/*` | Admin dashboard | admin (role per route) | `no-store` |
| `/health`, `/health/ready` | Load balancers | none | — |

`/api/products` is admin-only even though it sits outside `/api/admin`: it keeps the paths from the original spec, and it returns drafts, stock, and ImageKit file ids. The storefront uses `/api/store/products`.

### Admin API vs storefront API

| | Admin (`/api/admin`, `/api/products`) | Storefront (`/api/store`) |
| --- | --- | --- |
| Who | Authenticated admins | Anyone |
| Products | all statuses; `status`, `stock`, `publishedAt`, `categoryId`, timestamps, `imageKitFileId` | `published` only; `inStock` boolean instead of the count; no ids beyond product/color/image; no ImageKit file ids |
| Lookup key | product `id` (uuid) | product `slug` |
| Categories | all, with `productCount`, `isActive` | active only |
| Customers / orders | full access | none (checkout returns only its own receipt) |
| Caching | never | CDN/browser cacheable |

Public DTOs are separate Zod schemas (`store*Schema`), and the response serializer **drops any field not in the schema**. A field accidentally added to a query cannot leak through a storefront response.

## Response envelope

Single resource:

```json
{ "data": { "id": "…" } }
```

Collection:

```json
{
  "data": [ … ],
  "pagination": { "page": 1, "pageSize": 20, "total": 100, "totalPages": 5 }
}
```

Unpaginated small lists (e.g. `GET /api/store/categories`) return `{ "data": [ … ] }`.

`204 No Content` (empty body) for deletes.

Error:

```json
{ "error": { "code": "SOME_CODE", "message": "Human readable message", "details": … } }
```

`details` is optional and code-specific (e.g. validation issues, `{ "available": 2 }` for stock).

## Pagination, search, sorting

- `page` (≥ 1, default 1), `pageSize` (1–100, default 20). **Nothing returns unbounded rows**; the public category list is capped at 500.
- `total` comes from a `count(*)` query with the same filters, run in parallel with the page query.
- `search` is trimmed; blank means no search. `%` and `_` are escaped, so they match literally. Matching is case-insensitive substring (`ILIKE`, trigram-indexed).
- `sort` is always an enum per endpoint. Every sort has a stable tiebreaker (`id`), so pages don't shuffle.

## Validation

Every route declares Zod schemas for `params`, `querystring`, and `body`. Validation runs **after** authentication and **before** the handler; business logic never sees unvalidated input. Unknown body fields are stripped (e.g. a client-sent `price` on checkout items is discarded).

Failure → **422**:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      { "location": "body", "path": "colors.0.hexValue", "message": "Must be a hex color such as #1E1E1E" }
    ]
  }
}
```

`location` is `body`, `querystring`, or `params`, and `path` uses dot notation.

## Errors

All errors pass through `src/plugins/error-handler.ts`. Stack traces, SQL, and driver messages are **never** sent to clients. In production a 500 is just `{ code: "INTERNAL_ERROR", message: "An unexpected error occurred" }`. The full error is logged with the request id (outside production, `details.message` is included to speed up debugging).

### Status codes

| Status | When |
| --- | --- |
| 400 | Malformed request: invalid JSON, empty JSON body, unsupported content type |
| 401 | Missing, malformed, invalid, or expired token |
| 403 | Valid token but not an active admin, or role too low |
| 404 | Resource or route not found (including unpublished products on the storefront) |
| 409 | Uniqueness or reference conflict (duplicate slug/SKU/color name/ImageKit file; category in use) |
| 413 | Body larger than 1 MB |
| 422 | Schema validation failure, or a business rule violated |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |
| 502 | ImageKit could not be reached to verify an upload |
| 503 | `/health/ready` when the database is unreachable |

### Error codes

| Code | Status | Meaning |
| --- | --- | --- |
| `BAD_REQUEST` | 400 (413) | Request could not be parsed |
| `VALIDATION_ERROR` | 422 | Input failed schema validation (`details` = issues). Also used when checkout omits a required color |
| `UNAUTHENTICATED` | 401 | See message: missing header / invalid token / expired |
| `FORBIDDEN` | 403 | Not an admin, deactivated, or insufficient role |
| `NOT_FOUND` | 404 | Resource (`"Product not found"`) or route |
| `CONFLICT` | 409 | Unique/foreign-key conflict; message says which |
| `BUSINESS_RULE_VIOLATION` | 422 | e.g. publishing without images, compareAtPrice ≤ price, unknown category |
| `INVALID_STATUS_TRANSITION` | 422 | Order status change not allowed; `details = { from, to, allowed }` |
| `INSUFFICIENT_STOCK` | 422 | Checkout quantity > stock; `details = { productId, available }` |
| `PRODUCT_UNAVAILABLE` | 422 | Checkout references an unpublished/unknown product or a color from another product |
| `INVALID_IMAGE` | 422 | Image URL not on our ImageKit endpoint, file missing in ImageKit, or URL/file mismatch |
| `RATE_LIMITED` | 429 | Too many requests |
| `UPSTREAM_ERROR` | 502 | ImageKit unavailable during image verification |
| `INTERNAL_ERROR` | 500 / 503 | Unexpected failure |

Frontends should branch on `code`, not on `message`. Messages may be reworded.

## Security

| Control | Implementation |
| --- | --- |
| Authentication | Supabase JWT verified locally ([authentication.md](./authentication.md)) |
| Authorization | `requireAdmin(role)` on every admin route, as an `onRequest` hook |
| Input validation | Zod on params/query/body. Body limit 1 MB. Unknown fields stripped |
| Output filtering | Response schemas strip unlisted fields. Separate public DTOs |
| SQL injection | Parameterised queries only (postgres.js tagged templates). Dynamic `ORDER BY` comes from whitelisted fragments |
| Secure headers | `@fastify/helmet`: HSTS, `nosniff`, frame denial, `default-src 'none'` CSP (CSP is relaxed only when Swagger UI is enabled, i.e. outside production by default) |
| CORS | Explicit allow-list from `CORS_ORIGIN` (required in production). No credentials (bearer tokens, no cookies) |
| Rate limiting | Global `RATE_LIMIT_MAX` per IP per `RATE_LIMIT_WINDOW` (default 300/min); checkout `CHECKOUT_RATE_LIMIT_MAX`/min (default 10); `/health` exempt. Set `TRUST_PROXY=true` behind a proxy so limits apply per client IP |
| Secrets | Env vars only, validated at boot. Never logged (auth headers redacted), never returned |
| Price integrity | Checkout prices, stock, and totals come from the database ([orders](../features/orders/README.md)) |
| Database | Frontends have no table access (RLS + revoked grants) |
| Request tracing | `X-Request-Id` accepted (if well-formed) or generated, returned on every response, and included in every log line |

## Caching

Decision record: [ADR 007](../decisions/007-caching-strategy.md).

- Storefront `GET`s send `Cache-Control: public, max-age=N, s-maxage=N, stale-while-revalidate=5N` (`N = STORE_CACHE_MAX_AGE`, default 60 s). Put a CDN in front of `/api/store` to absorb traffic. Product edits become visible within N seconds.
- Admin responses and upload signatures send `Cache-Control: no-store`.
- No in-process cache. Every instance is stateless.

Responses over 1 KB are compressed (br/gzip/deflate).

## Versioning

The API is currently unversioned (`/api/...`). Rules for changing it are in [contributing.md](../development/contributing.md#api-change-rules): additive changes are fine, and breaking changes need a new path or a coordinated frontend release plus a changelog entry. If a breaking change becomes unavoidable, introduce `/api/v2` for the affected routes.

## Admin dashboard integration notes

The existing admin panel (`e-commerce-admin-panel/src/types/api.ts`, `src/lib/api/*`) was written against an assumed contract before this server existed. The server follows the agreed spec, so **the admin panel's API client needs these adjustments**:

| Admin panel today | This API | Change needed in the admin panel |
| --- | --- | --- |
| Responses unwrapped: `Product`, `Paginated<T> = { items, pagination.totalItems }` | `{ data }`, `{ data, pagination: { total } }` | Unwrap `data` in `apiClient.request`; map `items → data`, `totalItems → total` |
| Error payload read as `{ message, code }` | `{ error: { code, message, details } }` | Read `payload.error.message` / `payload.error.code` |
| `/products` (list/get) | `/api/products`, `/api/products/:id` | Base URL should include `/api` |
| `POST/PATCH/DELETE /products…` | `/api/admin/products…` | Update paths |
| `PATCH /products/:id/status` | `PATCH /api/admin/products/:id` with `{ status }` | Use the general PATCH |
| `GET /products/categories` → `string[]` | `GET /api/admin/categories` → category objects | Use `categoryId` (uuid) instead of a category name string |
| `/orders…`, `/customers`, `/dashboard/metrics` | `/api/admin/orders…`, `/api/admin/customers`, `/api/admin/dashboard` | Update paths; dashboard shape is grouped (`orders.pending`, `revenue.total`, …) |
| `GET /imagekit/auth` | `GET /api/admin/uploads/imagekit-auth` (also returns `folder`) | Update path |
| `POST /products/:id/images` (not color-scoped) | `POST /api/admin/products/:id/colors/:colorId/images` with `{ imageUrl, imageKitFileId, alt?, isPrimary? }` | Images belong to a color |
| Color fields `hex`, `position`, `defaultImageId`; image fields `url`, `fileId`, `position` | `hexValue`, `sortOrder`, `primaryImageId`; `imageUrl`, `imageKitFileId`, `sortOrder`, `isPrimary` (+ `thumbUrl`) | Rename fields |
| `GET /auth/me` | `GET /api/auth/me` | Path only; shape matches `AdminProfile` |
| Status/role enums | identical (`draft/published/archived`, `pending/processing/shipped/delivered/cancelled`, `pending/paid/refunded/failed`, `owner/admin/staff`) | none |
