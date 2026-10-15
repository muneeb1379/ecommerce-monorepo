# 003. Orders Snapshot Purchase-Time Data

## Status

Accepted

## Context

Products are edited over time: renamed, repriced, colors removed, deleted. An order placed last month must keep showing what the customer actually bought and paid. If order items only referenced `products`, a price change would silently rewrite order history and totals, and deleting a product would break old orders. The same holds for customer contact details and addresses.

## Decision

1. **`order_items` stores a snapshot** at checkout: `product_name`, `product_sku`, `color_name`, `color_hex`, `image_url`, `unit_price`, `quantity`, `line_total`. Rendering an order reads only these columns.
2. `order_items.product_id` / `product_color_id` are kept as **informational links** with `ON DELETE SET NULL`. Deleting a product never deletes or alters order data.
3. **`orders` snapshots the customer and address**: `customer_email`, `customer_name`, `customer_phone`, and the full shipping address as columns. `customer_id` links to the customer record (set null if the customer is deleted).
4. **Totals are stored**: `subtotal`, `shipping_cost`, `total`, `currency`. They are computed once by the server at checkout from database prices, in integer cents, and never recomputed from the catalog.
5. **Status changes are recorded** in `order_status_history` (from, to, admin, note, time) in the same transaction as the change.

## Alternatives Considered

- **Reference-only order items (join to products at read time).** Smaller rows, but history becomes wrong as soon as anything changes. Rejected outright.
- **Product versioning (immutable product revisions referenced by order items).** Exact, but far more complex (every edit creates a revision, and admin screens must reason about versions). Snapshots capture everything an order needs.
- **Storing a JSON blob of the whole product on each item.** Captures everything, but is untyped, hard to query/report on, and includes data orders don't need.

## Consequences

- Order rows duplicate some catalog data. That is intentional and small.
- Reports on "what sold" group by the snapshot fields (or by `product_id` while it still exists).
- Customer contact changes (if customer editing is added) do not change past orders. That is correct for invoices and shipping.
- A cancelled order returns its quantities to stock only for products that still exist (`product_id` not null).

## Date

2026-09-23
