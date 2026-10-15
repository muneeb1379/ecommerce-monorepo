# Orders

## Purpose

Order management for the admin dashboard (list, search, details, status changes) and guest checkout for the storefront, with server-authoritative pricing and permanent purchase-time snapshots.

## Status

**Status: In Progress**

Completed:

- Admin: list with pagination, search, status/payment-status/customer/date filters, sorting
- Admin: order details (customer, contact, shipping address, items with color snapshots, totals, statuses, status history, allowed next statuses)
- Admin: line items endpoint
- Admin: status changes validated against the lifecycle, recorded in history, restocking on cancel, all in one transaction
- Storefront: guest checkout (`POST /api/store/orders`), with prices, stock, shipping, and totals computed by the server under row locks
- Unit, HTTP, and real-database integration tests

Pending (required before this feature can be marked Complete):

- **Payment integration**: orders are created with `paymentStatus: pending`, and no endpoint or webhook changes the payment status yet (e.g. a Stripe webhook → `paid`/`failed`, refunds → `refunded`)
- Order confirmation emails

## Responsibilities

- Tables: `orders`, `order_items`, `order_status_history` ([database.md](./database.md)); writes `customers` and `addresses` during checkout
- Order lifecycle (`order-status.ts`)
- Price/stock/total computation at checkout
- Admin order DTOs (`orders.mapper.ts`), also used by the dashboard's recent orders

## Dependencies

- **Auth**: all admin endpoints need `staff` or higher
- **Products**: reads price, stock, status, colors, and primary image at checkout; decrements and restores `products.stock`
- **Customers**: find-or-create by email at checkout
- **Supabase Postgres**

## Business Rules

- **The client never determines price, availability, or totals.** Checkout accepts only `productId`, optional `colorId`, and `quantity`. Any other fields (e.g. `price`) are stripped by validation and ignored.
- Checkout, all in one transaction:
  1. Duplicate lines (same product + color) are merged.
  2. Every product is locked `FOR UPDATE` (in id order, avoiding deadlocks between concurrent checkouts).
  3. Each product must be `published`. The color, if given, must belong to that product. A product that has colors requires a `colorId`.
  4. Total quantity per product must be ≤ `stock` (`422 INSUFFICIENT_STOCK`).
  5. Unit price = current `products.price`. Line total = unit × qty. Arithmetic is in integer cents.
  6. Shipping = `SHIPPING_FLAT_RATE`, or 0 when subtotal ≥ `FREE_SHIPPING_THRESHOLD`. Total = subtotal + shipping.
  7. Stock is decremented. The customer is found or created by email (an existing customer's profile is **not** overwritten). The address is saved. The order, items, and an initial history row are inserted.
  8. Any failure rolls back everything.
- **Snapshots** ([ADR 003](../../decisions/003-order-snapshots.md)): items store product name, SKU, color name/hex, image URL, and unit price at purchase time. Orders store customer name, email, phone, and shipping address. Later product or customer changes never alter an existing order.
- Currency is `CURRENCY` (single-currency store).

### Order lifecycle

```
pending ──► processing ──► shipped ──► delivered
   │             │
   └─────────────┴──► cancelled
```

| From | Allowed next |
| --- | --- |
| `pending` | `processing`, `cancelled` |
| `processing` | `shipped`, `cancelled` |
| `shipped` | `delivered` |
| `delivered` | — (terminal) |
| `cancelled` | — (terminal) |

- Any other transition → `422 INVALID_STATUS_TRANSITION` with `details.allowed`.
- Setting the current status again is a no-op (200, no history row).
- **Cancel** returns every item's quantity to stock (for products that still exist) in the same transaction.
- Every change writes `order_status_history` (from, to, admin id from the token, optional note).
- The response includes `allowedTransitions`, so the dashboard can render only valid actions.
- "Completed" in the dashboard means `delivered`.

### Payment status

`pending | paid | refunded | failed`. It is independent of the fulfilment status. It is set to `pending` at checkout and cannot be changed through the API yet (see Pending). Revenue metrics only count `paid` orders that are not `cancelled`.

## API

See [api.md](./api.md).

## Database

See [database.md](./database.md).

## Known Limitations

- No payment capture: checkout reserves stock immediately for unpaid orders. Abandoned unpaid orders must be cancelled manually to release stock.
- Guest checkout only; customers cannot view their orders on the storefront.
- Single currency; flat-rate shipping; no taxes or discounts.
- Checkout is rate limited per IP (`CHECKOUT_RATE_LIMIT_MAX`, default 10/min) but has no CAPTCHA.

## Future Work

- Payment provider integration (payment intents, webhooks setting `payment_status`), and auto-cancelling unpaid orders after a timeout
- Refund flow (`refunded`, partial refunds)
- Taxes, discount codes, shipping rules by country
- Customer order lookup (by order number + email, or storefront accounts)
- Confirmation/shipping notification emails
