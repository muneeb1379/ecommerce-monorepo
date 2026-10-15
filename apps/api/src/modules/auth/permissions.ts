import type { AdminRole } from './auth.types.js'

/**
 * Authorization model: a single role per admin, ordered by privilege.
 * A route declares the minimum role it needs (default: any admin).
 *
 *   staff  — day-to-day operations: read everything, manage orders
 *   admin  — also manages the catalog (products, colors, images, categories)
 *   owner  — reserved for account-level operations
 *
 * To add a permission: pick the minimum role and pass it to
 * `app.guards.requireAdmin('<role>')` on the route. If a future need does not
 * fit a strict hierarchy, replace this file with a role → permission map; the
 * guard signature is the only thing routes depend on.
 * See docs/architecture/authentication.md#authorization.
 */

const ROLE_RANK: Record<AdminRole, number> = {
  staff: 1,
  admin: 2,
  owner: 3,
}

export const ADMIN_ROLES = Object.keys(ROLE_RANK) as AdminRole[]

export function hasRole(actual: AdminRole, required: AdminRole): boolean {
  return ROLE_RANK[actual] >= ROLE_RANK[required]
}
