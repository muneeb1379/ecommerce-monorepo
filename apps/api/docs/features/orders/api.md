# Orders API

Conventions: [api-architecture.md](../../architecture/api-architecture.md).

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/admin/orders` | admin (staff+) |
| GET | `/api/admin/orders/:id` | admin (staff+) |
| GET | `/api/admin/orders/:id/items` | admin (staff+) |
| PATCH | `/api/admin/orders/:id/status` | admin (staff+) |
| POST | `/api/store/orders` | public, rate limited |

All admin responses: `Cache-Control: no-store`. Common admin errors: `401 UNAUTHENTICATED`, `403 FORBIDDEN`, `422 VALIDATION_ERROR`.

---

## GET /api/admin/orders

Query:

| Param | Type | Default | Notes |
| --- | --- | --- | --- |
| `page`, `pageSize` | int | 1, 20 | `pageSize` ≤ 100 |
| `search` | string | — | order number, customer email, or customer name (substring, case-insensitive) |
| `status` | `pending\|processing\|shipped\|delivered\|cancelled` | — | |
| `paymentStatus` | `pending\|paid\|refunded\|failed` | — | |
| `customerId` | uuid | — | a customer's order history |
| `dateFrom` | `YYYY-MM-DD` or ISO datetime | — | inclusive, on `createdAt` |
| `dateTo` | `YYYY-MM-DD` or ISO datetime | — | a date includes that whole day (UTC); a datetime is exclusive. Must be after `dateFrom` |
| `sort` | `created-desc\|created-asc\|total-desc\|total-asc` | `created-desc` | |

Response `200`:

```json
{
  "data": [
    {
      "id": "5a…", "orderNumber": "ORD-001001",
      "customerId": "c1…", "customerName": "Jane Doe", "customerEmail": "jane@example.com",
      "status": "pending", "paymentStatus": "pending",
      "itemCount": 2, "total": 44.98, "currency": "USD",
      "createdAt": "2026-09-23T10:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

`itemCount` is the sum of item quantities.

## GET /api/admin/orders/:id

Response `200`:

```json
{
  "data": {
    "id": "5a…",
    "orderNumber": "ORD-001001",
    "status": "processing",
    "paymentStatus": "paid",
    "allowedTransitions": ["shipped", "cancelled"],
    "currency": "USD",
    "customer": { "id": "c1…", "fullName": "Jane Doe", "email": "jane@example.com", "phone": "+1 555 0100" },
    "shippingAddress": { "line1": "1 Main St", "line2": null, "city": "Springfield", "state": "IL", "postalCode": "62701", "country": "US" },
    "items": [
      {
        "id": "it1…", "productId": "3f0c…", "colorId": "a1…",
        "productName": "Classic T Shirt", "sku": "TSHIRT-001",
        "colorName": "Black", "colorHex": "#000000",
        "imageUrl": "https://ik.imagekit.io/…",
        "quantity": 2, "unitPrice": 19.99, "subtotal": 39.98
      }
    ],
    "subtotal": 39.98,
    "shippingCost": 5,
    "total": 44.98,
    "history": [
      { "fromStatus": null, "toStatus": "pending", "changedByName": null, "note": "Order placed", "createdAt": "…" },
      { "fromStatus": "pending", "toStatus": "processing", "changedByName": "Sam Staff", "note": null, "createdAt": "…" }
    ],
    "createdAt": "…",
    "updatedAt": "…"
  }
}
```

- Customer, address, and item fields are **purchase-time snapshots**. `customer.id`, `productId`, and `colorId` become `null` if the linked record was deleted later.
- `customer.phone` is `null` when not provided.

Errors: `404` order not found; `422` malformed id.

## GET /api/admin/orders/:id/items

Response `200`: `{ "data": [ OrderItem, … ] }` (same item shape as above). `404` if the order doesn't exist.

## PATCH /api/admin/orders/:id/status

Body:

| Field | Type | Rules |
| --- | --- | --- |
| `status` | order status | must be allowed from the current status ([lifecycle](./README.md#order-lifecycle)) |
| `note` | string | optional, ≤ 500, stored in history |

The acting admin is taken from the token (any `changedBy` in the body is ignored).

Response `200`: the full order (as `GET /:id`).

Errors: `404`; `422 INVALID_STATUS_TRANSITION`:

```json
{ "error": { "code": "INVALID_STATUS_TRANSITION", "message": "Cannot change order status from delivered to pending", "details": { "from": "delivered", "to": "pending", "allowed": [] } } }
```

Setting the current status is a no-op returning `200`. `cancelled` restores stock.

---

## POST /api/store/orders

Guest checkout. **Rate limit**: `CHECKOUT_RATE_LIMIT_MAX` per minute per IP (default 10) → `429 RATE_LIMITED`.

Body:

| Field | Type | Rules |
| --- | --- | --- |
| `customer.email` | string | valid email ≤ 254; stored lower-cased |
| `customer.fullName` | string | 1–200 |
| `customer.phone` | string \| null | optional, `^\+?[0-9 ()-]{6,20}$` |
| `shippingAddress.line1` | string | 1–200 |
| `shippingAddress.line2` | string \| null | optional, ≤ 200 |
| `shippingAddress.city` | string | 1–100 |
| `shippingAddress.state` | string | optional, ≤ 100 |
| `shippingAddress.postalCode` | string | 1–20 |
| `shippingAddress.country` | string | ISO 3166-1 alpha-2, upper-cased |
| `items` | array 1–50 | `{ productId: uuid, colorId?: uuid, quantity: 1–100 }` |

**Prices are never accepted from the client.** Extra fields such as `price` are discarded.

```json
{
  "customer": { "email": "jane@example.com", "fullName": "Jane Doe" },
  "shippingAddress": { "line1": "1 Main St", "city": "Springfield", "postalCode": "62701", "country": "US" },
  "items": [ { "productId": "3f0c…", "colorId": "a1…", "quantity": 2 } ]
}
```

Response `201`: the receipt only (no internal ids):

```json
{
  "data": {
    "orderNumber": "ORD-001002",
    "status": "pending",
    "paymentStatus": "pending",
    "currency": "USD",
    "items": [ { "productName": "Classic T Shirt", "colorName": "Black", "quantity": 2, "unitPrice": 19.99, "lineTotal": 39.98 } ],
    "subtotal": 39.98,
    "shippingCost": 5,
    "total": 44.98,
    "createdAt": "2026-09-23T10:00:00.000Z"
  }
}
```

Errors (`422`):

| Code | When | `details` |
| --- | --- | --- |
| `VALIDATION_ERROR` | invalid body, or missing `colorId` for a product that has colors | issues / `{ productId }` |
| `PRODUCT_UNAVAILABLE` | unknown or unpublished product; color not of that product | `{ productId, colorId? }` |
| `INSUFFICIENT_STOCK` | requested quantity > stock (summed across lines) | `{ productId, available }` |
