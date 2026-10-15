import type { AdminRole } from '@/types/api'

/**
 * Mirrors the API's role hierarchy (owner > admin > staff). The server is the
 * authority and rejects anything not allowed with 403; this only decides which
 * controls to show.
 */
const roleRank: Record<AdminRole, number> = { staff: 1, admin: 2, owner: 3 }

export function hasRole(role: AdminRole | undefined, minimum: AdminRole): boolean {
  return role !== undefined && roleRank[role] >= roleRank[minimum]
}
