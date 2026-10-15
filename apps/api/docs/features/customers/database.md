# Customers — Database

## `customers`

| Column | Type | Constraints / default | Notes |
| --- | --- | --- | --- |
| `id` | uuid | PK | |
| `auth_user_id` | uuid | unique, FK → `auth.users.id` ON DELETE SET NULL | reserved for storefront accounts; null for guests |
| `email` | text | not null; unique on `lower(email)` (`customers_email_key`) | stored lower-cased by checkout |
| `full_name` | text | not null, default `''` | |
| `phone` | text | null | |
| `created_at`, `updated_at` | timestamptz | | |

Indexes: `(created_at desc)`, GIN trigram on `full_name` and `email`.

## `addresses`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | uuid | PK | |
| `customer_id` | uuid | FK → `customers.id` **ON DELETE CASCADE** | |
| `line1`, `city`, `postal_code` | text | not null | |
| `line2` | text | null | |
| `state` | text | not null, default `''` | |
| `country` | text | `^[A-Z]{2}$` | ISO 3166-1 alpha-2 |
| `is_default` | boolean | default false | true for a customer's first address |
| `created_at`, `updated_at` | timestamptz | | |

Index: `(customer_id)`.

## Relationships & ownership

- `orders.customer_id` → `customers.id` ON DELETE SET NULL (orders keep their contact/address snapshot).
- Written by the orders module's checkout transaction (`INSERT … ON CONFLICT ((lower(email))) DO UPDATE SET email = customers.email RETURNING id` returns the existing id without changing profile fields).
- Customer stats are computed with a `LEFT JOIN LATERAL` aggregate over `orders` (indexed by `orders (customer_id, created_at desc)`). Nothing is denormalised.
