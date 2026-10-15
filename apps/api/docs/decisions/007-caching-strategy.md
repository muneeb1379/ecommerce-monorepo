# 007. Caching Strategy

## Status

Accepted

## Context

Storefront traffic is read-heavy and identical for every visitor. Admin traffic is low-volume, per-user, and must always be fresh. The API runs as multiple stateless instances.

## Decision

1. **Storefront GETs are HTTP-cacheable**: `Cache-Control: public, max-age=N, s-maxage=N, stale-while-revalidate=5N`, with `N = STORE_CACHE_MAX_AGE` (default 60 s). A CDN or reverse proxy in front of `/api/store` absorbs repeated reads; browsers reuse responses too.
2. **Admin responses and upload credentials are `no-store`.**
3. **No application-level cache** (no Redis, no in-memory store). Postgres serves cache misses with indexed, single-round-trip queries.
4. Responses over 1 KB are compressed.

## Alternatives Considered

- **In-process LRU per instance.** Inconsistent across instances, and invalidation is hard. Rejected.
- **Redis with explicit invalidation on product writes.** Fresher data at scale, but adds infrastructure that current traffic doesn't justify. Revisit if storefront traffic outgrows CDN caching.
- **ETag/conditional requests.** Useful later. With short max-age plus stale-while-revalidate, the benefit is small today.

## Consequences

- Catalog edits (price, publish/unpublish, images) can take up to `N` seconds (plus the stale window at the CDN) to appear on the storefront. Set `STORE_CACHE_MAX_AGE=0` to disable caching; responses then send `no-cache`.
- Checkout always reads live prices and stock under row locks, so a stale product page can never cause a wrong charge. The worst case is a checkout error ("insufficient stock" / "unavailable").
- Deploying a CDN is an infrastructure task outside this repository.

## Date

2026-09-23
