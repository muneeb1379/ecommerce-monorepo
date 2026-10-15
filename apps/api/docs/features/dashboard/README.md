# Dashboard

## Purpose

One endpoint that gives the admin dashboard's home screen its numbers, aggregated in the database. The frontend never downloads orders to compute totals.

## Status

**Status: Complete**

Completed:

- `GET /api/admin/dashboard`: product, order, revenue, and customer metrics plus the 5 most recent orders
- Tests (HTTP and real-database integration)

Pending: none within scope.

## Responsibilities

- `dashboard.repository.ts`: one aggregate SQL statement
- Reuses the orders repository and mapper for recent orders

## Dependencies

- Auth (`staff`+)
- Tables: `products`, `orders`, `customers` (read-only)

## Metric definitions

| Metric | Definition |
| --- | --- |
| `products.total` | products with `status <> 'archived'` |
| `products.published` | `status = 'published'` |
| `products.lowStock` | published products with `stock <= 5` (`LOW_STOCK_THRESHOLD`) |
| `orders.total` | all orders |
| `orders.pending` / `processing` / `shipped` / `cancelled` | count by `status` |
| `orders.completed` | `status = 'delivered'` |
| `revenue.total` | `sum(total)` where `payment_status = 'paid'` and `status <> 'cancelled'` |
| `revenue.last30Days` | same, `created_at >= now() - 30 days` |
| `revenue.previous30Days` | same, `now() - 60 days <= created_at < now() - 30 days` |
| `revenue.changePct` | `(last30 - previous30) / previous30 × 100`, 1 decimal. `0` if both are 0; `null` if previous is 0 and last is not (growth from nothing is undefined) |
| `customers.total` | all customers |
| `recentOrders` | 5 newest orders (same shape as the order list) |

All values come from **one** SQL statement (three CTEs with `count(*) FILTER (…)` / `sum(…) FILTER (…)`) plus one indexed query for recent orders, run in parallel.

## API

See [api.md](./api.md).

## Known Limitations

- Revenue only counts `paid` orders. Until payments are integrated ([orders](../orders/README.md#status)), revenue stays 0 unless payment status is set in the database.
- Windows are rolling 30 days in server time (UTC), not calendar months.
- Revenue is in the single store currency.
- Every call aggregates live. That's fine for small and medium stores; add a short cache or a materialised view if order volume grows large.

## Future Work

- Date-range parameter, time series for charts, top products
