# Customers Changelog

## 2026-09-23

### Added

- `customers` and `addresses` tables (migration `0001_initial_schema`).
- `GET /api/admin/customers` (search, sort, pagination, order count, total spent, last order).
- `GET /api/admin/customers/:id` with addresses.

### Technical Notes

- Customers are created by storefront checkout (find-or-create by case-insensitive email). Existing profiles are never overwritten by checkout.
