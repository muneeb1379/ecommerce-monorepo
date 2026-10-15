# Categories API

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/store/categories` | public |
| GET | `/api/admin/categories` | admin (staff+) |
| GET | `/api/admin/categories/:id` | admin (staff+) |
| POST | `/api/admin/categories` | admin (admin+) |
| PATCH | `/api/admin/categories/:id` | admin (admin+) |
| DELETE | `/api/admin/categories/:id` | admin (admin+) |

## GET /api/store/categories

Active categories, ordered by `sortOrder`, then name. Not paginated (capped at 500). Cacheable.

```json
{ "data": [ { "id": "c0…", "name": "T-Shirts", "slug": "t-shirts", "description": "Everyday tees" } ] }
```

## GET /api/admin/categories

Query: `page`, `pageSize` (≤ 100), `search` (name or slug).

```json
{
  "data": [
    {
      "id": "c0…", "name": "T-Shirts", "slug": "t-shirts", "description": "",
      "sortOrder": 0, "isActive": true, "productCount": 12,
      "createdAt": "…", "updatedAt": "…"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

## GET /api/admin/categories/:id

`{ "data": AdminCategory }`. `404` if missing.

## POST /api/admin/categories

| Field | Type | Required | Rules |
| --- | --- | --- | --- |
| `name` | string | ✓ | 1–100, trimmed |
| `slug` | string | ✓ | `^[a-z0-9]+(-[a-z0-9]+)*$`, ≤ 100, unique |
| `description` | string | | ≤ 2000, default `""` |
| `sortOrder` | int | | 0–10000, default 0 |
| `isActive` | boolean | | default true |

Response `201`: `{ "data": AdminCategory }`. Errors: `409` duplicate slug, `422` validation.

## PATCH /api/admin/categories/:id

Any subset of the create fields (at least one). Response `200`. Errors: `404`, `409`, `422`.

## DELETE /api/admin/categories/:id

Response `204`. Errors: `404`; `409 CONFLICT` "This category still has products. Move or delete them first."
