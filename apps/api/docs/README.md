# Ecommerce API Documentation

Start here. This server is the single backend for the **admin dashboard** and the **public storefront**. It is the only component allowed to access the ecommerce database (Supabase Postgres) and the only holder of the ImageKit private key.

```
Admin Dashboard ──┐                        ┌──► Supabase Postgres
                  ├──►  Node.js API  ──────┤
Storefront ───────┘   (this repository)    └──► ImageKit
```

- Admin dashboard → `/api/auth`, `/api/products`, `/api/admin/*` with a Supabase access token
- Storefront → `/api/store/*`, public and cacheable
- Interactive API reference (development): `http://localhost:4000/docs`

## Architecture

| Document | Covers |
| --- | --- |
| [Overview](./architecture/overview.md) | Components, tech stack, source layout, request flow, layer rules |
| [Authentication & authorization](./architecture/authentication.md) | Sign-in flow, JWT verification, roles, permission matrix, managing admins |
| [Database](./architecture/database.md) | Entity map, cascade rules, access lockdown, transactions, indexes, migrations |
| [API architecture](./architecture/api-architecture.md) | URL layout, admin vs storefront, envelopes, errors & codes, security, caching, admin panel integration notes |
| [Image management](./architecture/image-management.md) | ImageKit upload and deletion lifecycles, failure handling, color-switch preloading |

## Features

| Feature | Status | Documentation |
| --- | --- | --- |
| Auth | Complete | [features/auth](./features/auth/README.md) |
| Products (colors, images, storefront catalog) | Complete | [features/products](./features/products/README.md) |
| Categories | Complete | [features/categories](./features/categories/README.md) |
| Orders (admin + guest checkout) | In Progress: payment integration pending | [features/orders](./features/orders/README.md) |
| Customers (read-only admin views) | Complete | [features/customers](./features/customers/README.md) |
| Dashboard metrics | Complete | [features/dashboard](./features/dashboard/README.md) |
| Uploads (ImageKit signing + cleanup) | Complete | [features/uploads](./features/uploads/README.md) |

Each feature folder has `README.md` (purpose, status, rules, limitations), `api.md` (endpoints and contracts), `changelog.md`, and, for features that own tables, `database.md`. Dashboard owns no tables; the uploads queue table is documented in its README.

## Development

| Document | Covers |
| --- | --- |
| [Setup](./development/setup.md) | Install, Supabase, ImageKit, first admin, run, test, build, deploy |
| [Environment variables](./development/environment.md) | Every variable, defaults, secrets |
| [Contributing](./development/contributing.md) | Feature workflow, docs rules, testing, migrations, API change rules |

Quick start:

```bash
pnpm install && cp .env.example .env   # at the monorepo root; fill in .env
npm run db:migrate
npm run admin:create -- --email you@example.com --role owner
npm run dev
```

## Architecture Decisions

| ADR | Decision |
| --- | --- |
| [001](./decisions/001-product-color-image-model.md) | Product → Color → Image model, one nested response for instant color switching |
| [002](./decisions/002-data-access-through-api-only.md) | API is the only DB client (RLS lockdown); SQL via postgres.js instead of Prisma/PostgREST |
| [003](./decisions/003-order-snapshots.md) | Orders snapshot product, price, customer, and address at purchase time |
| [004](./decisions/004-supabase-jwt-verification.md) | Local JWT verification; admin roles from `admin_profiles` |
| [005](./decisions/005-imagekit-direct-upload-and-deletion-outbox.md) | Direct ImageKit uploads; deletion outbox with retries |
| [006](./decisions/006-api-contract-conventions.md) | Envelopes, route layout, status codes, spec over admin-panel assumptions |
| [007](./decisions/007-caching-strategy.md) | CDN-cacheable storefront, `no-store` admin, no app cache |

## Recent Changes

**2026-09-23: Initial implementation**

- All modules implemented: auth, products (colors/images), categories, orders (admin + guest checkout), customers, dashboard, uploads.
- Schema migration `0001_initial_schema` with the RLS lockdown for API-only access.
- 110 automated tests, including a real-Postgres integration suite and doc/route sync checks. The integration run caught a `restrict_violation` (SQLSTATE 23001) mapping bug, fixed before release ([categories changelog](./features/categories/changelog.md)).
- The admin panel's API client must be adapted to this contract ([integration notes](./architecture/api-architecture.md#admin-dashboard-integration-notes)).

## What remains

- **Payments**: provider integration and payment-status updates ([orders](./features/orders/README.md#status)). This is the main gap before taking real orders.
- Admin panel client updates to match this API (see integration notes above).
- Orphaned-upload reconciliation for ImageKit ([uploads](./features/uploads/README.md#future-work)).
- Nice-to-haves listed under each feature's Future Work (variants, bulk import, category hierarchy, admin management API).
