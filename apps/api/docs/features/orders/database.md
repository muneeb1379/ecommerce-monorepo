# Orders — Database

Migration: `db/migrations/0001_initial_schema.sql`. Snapshot rationale: [ADR 003](../../decisions/003-order-snapshots.md).

```
customers 1 ── N orders 1 ── N order_items ─ ─ ─► products / product_colors   (informational, SET NULL)
          (set null)    │  (cascade)
                        └─ 1 ── N order_status_history ─ ─ ─► admin_profiles  (changed_by, SET NULL)
                               (cascade)
```

## `orders`

| Column | Type | Constraints / default | Notes |
| --- | --- | --- | --- |
| `id` | uuid | PK | |
| `order_number` | text | unique, default `'ORD-' \|\| lpad(nextval('order_number_seq'), 6, '0')` (starts at 1001) | human-facing reference |
| `customer_id` | uuid | FK → `customers.id` **ON DELETE SET NULL** | |
| `customer_email`, `customer_name`, `customer_phone` | text | email/name not null | **snapshot** |
| `shipping_line1`, `shipping_line2`, `shipping_city`, `shipping_state`, `shipping_postal_code`, `shipping_country` | text | line1/city/postal/country not null | **snapshot** |
| `status` | `order_status` | default `pending` | fulfilment lifecycle |
| `payment_status` | `payment_status` | default `pending` | independent of `status` |
| `currency` | text | default `USD`, `^[A-Z]{3}$` | |
| `subtotal`, `shipping_cost`, `total` | numeric(12,2) | `>= 0` | computed by the server at checkout, never recomputed |
| `created_at`, `updated_at` | timestamptz | | |

Indexes: `(created_at desc)`, `(status, created_at desc)`, `(payment_status)`, `(customer_id, created_at desc)`, GIN trigram on `customer_email`, `customer_name`.

## `order_items`

| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | uuid | PK | |
| `order_id` | uuid | FK → `orders.id` **ON DELETE CASCADE** | |
| `product_id` | uuid | FK → `products.id` **ON DELETE SET NULL** | link only; used for restocking |
| `product_color_id` | uuid | FK → `product_colors.id` **ON DELETE SET NULL** | link only |
| `product_name`, `product_sku` | text | not null | **snapshot** |
| `color_name`, `color_hex`, `image_url` | text | null | **snapshot** (image = color's primary at purchase) |
| `unit_price` | numeric(12,2) | `>= 0` | **snapshot** of `products.price` |
| `quantity` | integer | `> 0` | |
| `line_total` | numeric(12,2) | `>= 0` | unit_price × quantity (exposed as `subtotal` per item) |
| `created_at` | timestamptz | | |

Indexes: `(order_id)`, `(product_id)`.

## `order_status_history`

| Column | Type | Notes |
| --- | --- | --- |
| `id` | uuid | PK |
| `order_id` | uuid | FK → `orders.id` ON DELETE CASCADE |
| `from_status` | `order_status` | null for the initial "placed" entry |
| `to_status` | `order_status` | |
| `changed_by` | uuid | FK → `admin_profiles.id` ON DELETE SET NULL; null for checkout |
| `note` | text | |
| `created_at` | timestamptz | |

Index: `(order_id, created_at)`.

## Sequence

`order_number_seq` starts at 1001. `USAGE` is revoked from `anon`/`authenticated`.

## Transaction requirements

| Operation | Steps (one transaction) |
| --- | --- |
| Checkout | lock products `FOR UPDATE` (id order) → validate → decrement stock → upsert customer by `lower(email)` → insert address → insert order → insert items → insert history(`null → pending`) |
| Status change | lock order `FOR UPDATE` → validate transition → update status → insert history → (cancel) restock items whose product still exists |

## Data ownership

Written only by the orders module (checkout and status changes). Read by the dashboard (aggregates, recent orders) and the customers module (order counts, total spent).
