# Dashboard Changelog

## 2026-09-23

### Added

- `GET /api/admin/dashboard` with product, order, revenue (30-day comparison), and customer metrics plus recent orders, all aggregated in SQL.

### Developer Notes

- The response is grouped (`orders.pending`, `revenue.total`, …). The admin panel's earlier assumed `DashboardMetrics` shape was flat (`pendingOrders`, `totalRevenue`, …) and needs mapping.
