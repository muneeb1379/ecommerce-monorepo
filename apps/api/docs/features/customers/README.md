# Customers

## Purpose

Read-only customer views for the admin dashboard: who has ordered, how often, and how much they have spent. Customers are created automatically by storefront checkout.

## Status

**Status: Complete** (scope: read-only admin views)

Completed:

- `GET /api/admin/customers` with search (name, email, phone), sorting, pagination, order count, total spent, last order date
- `GET /api/admin/customers/:id` with saved addresses
- Customer + address creation during checkout (orders module)
- Tests (HTTP and real-database integration)

Pending (outside the current scope):

- Admin create/edit/merge of customers
- Storefront customer accounts and self-service order history

## Responsibilities

- Tables `customers`, `addresses` ([database.md](./database.md)): read here; written by the orders module during checkout
- Customer statistics

## Dependencies

- Auth (`staff`+)
- Orders (source of order counts and spend)

## Business Rules

- A customer is identified by email, case-insensitively (unique `lower(email)`).
- Checkout finds or creates the customer by email and **does not overwrite** an existing customer's name or phone. Each order keeps its own snapshot, so an anonymous checkout cannot alter someone else's profile.
- Each checkout saves its shipping address. The customer's first address becomes the default.
- **Total spent** = sum of `total` for the customer's orders with `payment_status = 'paid'` and `status <> 'cancelled'` (the same definition as dashboard revenue). **Orders count** includes all orders.
- Customer data is private: there is no storefront endpoint that returns customer data.

## API

See [api.md](./api.md). A customer's orders: `GET /api/admin/orders?customerId=<id>`.

## Database

See [database.md](./database.md).

## Known Limitations

- Repeated checkouts with the same address create duplicate address rows.
- A customer who mistypes their email becomes a separate customer.

## Future Work

- Address de-duplication, customer editing and merging
- Storefront accounts linked via `customers.auth_user_id`
- GDPR export/erase tooling
