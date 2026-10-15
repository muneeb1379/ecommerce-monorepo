# Dashboard API

## GET /api/admin/dashboard

Auth: admin (`staff`+). `Cache-Control: no-store`.

Response `200`:

```json
{
  "data": {
    "currency": "USD",
    "products": { "total": 40, "published": 32, "lowStock": 3 },
    "orders": { "total": 120, "pending": 7, "processing": 4, "shipped": 9, "completed": 95, "cancelled": 5 },
    "revenue": { "total": 12345.67, "last30Days": 1500, "previous30Days": 1200, "changePct": 25 },
    "customers": { "total": 88 },
    "recentOrders": [
      {
        "id": "5a…", "orderNumber": "ORD-001120", "customerId": "c1…",
        "customerName": "Jane Doe", "customerEmail": "jane@example.com",
        "status": "pending", "paymentStatus": "paid", "itemCount": 2,
        "total": 44.98, "currency": "USD", "createdAt": "2026-09-23T10:00:00.000Z"
      }
    ]
  }
}
```

Metric definitions: [README](./README.md#metric-definitions). `revenue.changePct` may be `null`.

Errors: `401`, `403`.
