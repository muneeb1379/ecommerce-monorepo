# Architecture Decision Records

An ADR records a significant technical decision: the context, the choice, the alternatives, and the consequences. ADRs are never rewritten after acceptance. To change a decision, add a new ADR that supersedes the old one and set the old one's status to `Superseded by NNN`.

Write one for decisions about data modelling, security architecture, external services, API contracts, caching, or anything a future developer might otherwise "fix" without knowing why it is the way it is. Don't write one for routine implementation details.

| # | Decision | Status | Date |
| --- | --- | --- | --- |
| [001](./001-product-color-image-model.md) | Product → Color → Image model, returned as one nested response | Accepted | 2026-09-23 |
| [002](./002-data-access-through-api-only.md) | The API is the only database client; SQL via postgres.js | Accepted | 2026-09-23 |
| [003](./003-order-snapshots.md) | Order items and orders snapshot purchase-time data | Accepted | 2026-09-23 |
| [004](./004-supabase-jwt-verification.md) | Local Supabase JWT verification + DB-backed admin roles | Accepted | 2026-09-23 |
| [005](./005-imagekit-direct-upload-and-deletion-outbox.md) | Direct ImageKit uploads; transactional outbox for asset deletion | Accepted | 2026-09-23 |
| [006](./006-api-contract-conventions.md) | API contract: envelopes, route layout, status codes | Accepted | 2026-09-23 |
| [007](./007-caching-strategy.md) | HTTP caching for the storefront, none for admin | Accepted | 2026-09-23 |

Template:

```md
# NNN. Title

## Status
Proposed | Accepted | Superseded by NNN

## Context
## Decision
## Alternatives Considered
## Consequences
## Date
```
