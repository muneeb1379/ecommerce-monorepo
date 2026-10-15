# Categories

## Purpose

Groups products for navigation and filtering. Admins manage categories; the storefront lists the active ones and filters products by category slug.

## Status

**Status: Complete**

Completed:

- Admin CRUD: `GET/POST /api/admin/categories`, `GET/PATCH/DELETE /api/admin/categories/:id`
- Storefront list: `GET /api/store/categories`
- Product count per category (admin)
- Delete protection while products use the category
- Tests (HTTP and real-database integration)

Pending: none within scope.

## Responsibilities

- Table `categories` ([database.md](./database.md))
- Validating uniqueness and delete safety

## Dependencies

- Auth (reads: `staff`; writes: `admin`)
- Products reference categories (`products.category_id`)

## Business Rules

- Slugs are unique and URL-safe (`lowercase-with-hyphens`).
- Inactive categories (`isActive: false`) are hidden from `/api/store/categories`. Filtering the storefront by an inactive category's slug returns no products. Products in an inactive category are still visible in unfiltered storefront lists and by slug.
- A category **cannot be deleted while any product uses it** (409). Reassign or delete those products first, or deactivate the category instead.
- Order: `sortOrder` ascending, then name.

## API

See [api.md](./api.md).

## Database

See [database.md](./database.md).

## Known Limitations

- Flat list: no nested/sub-categories.
- A product has at most one category.

## Future Work

- Category hierarchy (`parent_id`), category images and SEO fields
- Many-to-many product ↔ category (collections)
