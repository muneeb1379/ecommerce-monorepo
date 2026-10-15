# Orders Changelog

## 2026-09-23

### Added

- Tables `orders`, `order_items`, `order_status_history`, sequence `order_number_seq` (migration `0001_initial_schema`).
- Admin endpoints: `GET /api/admin/orders`, `GET /api/admin/orders/:id`, `GET /api/admin/orders/:id/items`, `PATCH /api/admin/orders/:id/status`.
- Storefront guest checkout: `POST /api/store/orders`.
- Order lifecycle with validated transitions, status history, and restock on cancel.
- Purchase-time snapshots of product, color, price, customer, and address ([ADR 003](../../decisions/003-order-snapshots.md)).

### Technical Notes

- Checkout locks products `FOR UPDATE` in id order and computes totals in integer cents from database prices. Client-sent prices are discarded by validation.
- Order detail responses include `allowedTransitions` so the dashboard can show only valid actions.

### Developer Notes

- Payment status cannot be changed through the API yet; the feature stays **In Progress** until a payment integration lands.
- The checkout endpoint was not in the original endpoint list. It was added because the spec requires server-authoritative pricing and transactional order creation, and the storefront needs a way to place orders.

### Migration / Compatibility

- New tables; no backward-compatibility concerns.
