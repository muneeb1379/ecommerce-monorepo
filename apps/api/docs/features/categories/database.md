# Categories — Database

## `categories`

| Column | Type | Constraints / default | Notes |
| --- | --- | --- | --- |
| `id` | uuid | PK | |
| `name` | text | not null, length 1–100 | |
| `slug` | text | not null, **unique**, slug pattern | storefront filter key |
| `description` | text | not null, default `''` | |
| `sort_order` | integer | not null, default 0 | |
| `is_active` | boolean | not null, default true | hides from storefront list |
| `created_at`, `updated_at` | timestamptz | | |

Index: `(sort_order, name) WHERE is_active` (storefront list).

## Relationships

- `products.category_id` → `categories.id` **ON DELETE RESTRICT**. Postgres raises `23001 restrict_violation`, which the API maps to 409. This is intentional: silently un-categorising products (SET NULL) would change storefront navigation without anyone noticing.

## Transactions

Single-row writes only; no multi-statement transactions needed.
