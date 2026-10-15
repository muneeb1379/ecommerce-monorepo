# 006. API Contract Conventions

## Status

Accepted

## Context

Two independently developed frontends consume this API. They need a predictable, stable contract: the same envelope everywhere, consistent errors they can branch on, and a clear line between admin and public data. The admin panel already had an assumed contract (`src/types/api.ts`) that differs in places from the specification this server implements.

## Decision

1. **Envelopes**: `{ data }` for single resources, `{ data, pagination: { page, pageSize, total, totalPages } }` for collections, `{ error: { code, message, details? } }` for errors. Deletes return `204` with no body.
2. **Route layout**: `/api/store/*` public; `/api/admin/*` admin; `/api/auth/me` admin identity. `/api/products` and `/api/products/:id` are kept as specified, as **admin** product reads. The storefront reads by `slug`, the admin by `id`.
3. **Separate public DTOs.** Storefront responses use their own Zod schemas, and the serializer drops unlisted fields.
4. **Status codes**: 422 for both schema validation (`VALIDATION_ERROR`) and business-rule failures (specific codes); 400 only for unparseable requests; 409 for uniqueness/reference conflicts. Frontends branch on `error.code`.
5. **Zod is the single contract source**: request validation, TypeScript types, response filtering, and the OpenAPI document are all generated from the same schemas.
6. **Unversioned `/api` for now**, with change rules in [contributing.md](../development/contributing.md#api-change-rules).
7. **Follow the spec, not the admin panel's assumptions**, and document the differences ([api-architecture.md](../architecture/api-architecture.md#admin-dashboard-integration-notes)) so the panel's API client can be adapted in one place.

## Alternatives Considered

- **Match the admin panel's existing assumptions** (`{ items, pagination.totalItems }`, unprefixed paths). Less frontend work now, but it conflicts with the agreed spec, and the panel was built against mocks (MSW), not a real server.
- **400 for validation errors.** Common, but the admin panel already treats 422 as "validation", and 422 distinguishes "well-formed but invalid" from "unparseable".
- **URL versioning from day one (`/api/v1`).** Premature with no external consumers. The rules above cover when to introduce it.

## Consequences

- The admin panel's `apiClient` must unwrap `data`, read `error.*`, and update paths/field names (table in api-architecture.md).
- Every new endpoint must declare response schemas, which also documents it in OpenAPI.

## Date

2026-09-23
