# Customers API

| Method | Path | Auth |
| --- | --- | --- |
| GET | `/api/admin/customers` | admin (staff+) |
| GET | `/api/admin/customers/:id` | admin (staff+) |

## GET /api/admin/customers

Query: `page`, `pageSize` (≤ 100), `search` (name, email, or phone), `sort` (`created-desc` default | `name-asc` | `spent-desc` | `orders-desc`).

```json
{
  "data": [
    {
      "id": "c1…", "fullName": "Jane Doe", "email": "jane@example.com", "phone": null,
      "ordersCount": 3, "totalSpent": 134.97,
      "lastOrderAt": "2026-09-23T10:00:00.000Z", "createdAt": "2026-09-01T09:00:00.000Z"
    }
  ],
  "pagination": { "page": 1, "pageSize": 20, "total": 1, "totalPages": 1 }
}
```

## GET /api/admin/customers/:id

List fields plus `updatedAt` and `addresses` (default first, then newest):

```json
{
  "data": {
    "id": "c1…", "fullName": "Jane Doe", "email": "jane@example.com", "phone": null,
    "ordersCount": 3, "totalSpent": 134.97, "lastOrderAt": "…", "createdAt": "…", "updatedAt": "…",
    "addresses": [
      { "id": "a1…", "line1": "1 Main St", "line2": null, "city": "Springfield", "state": "IL", "postalCode": "62701", "country": "US", "isDefault": true }
    ]
  }
}
```

Errors: `401`, `403`, `404`, `422` (bad uuid).
