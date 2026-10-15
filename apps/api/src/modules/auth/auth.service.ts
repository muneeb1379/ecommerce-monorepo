import type { Database } from '../../lib/db.js'
import { forbidden } from '../../lib/errors.js'
import type { AuthRepository } from './auth.repository.js'
import type { AdminProfile, AdminRole } from './auth.types.js'
import { hasRole } from './permissions.js'

export class AuthService {
  constructor(
    private readonly db: Database,
    private readonly repository: AuthRepository,
  ) {}

  /**
   * Resolves the admin profile for a verified user id. The profile is read on
   * every request (a primary-key lookup) so deactivating an admin or changing
   * their role takes effect immediately, without waiting for token expiry.
   */
  async requireAdmin(userId: string, minimumRole: AdminRole = 'staff'): Promise<AdminProfile> {
    const profile = await this.repository.findAdminProfileById(this.db.sql, userId)
    if (!profile || !profile.isActive) {
      throw forbidden('This account does not have admin access')
    }
    if (!hasRole(profile.role, minimumRole)) {
      throw forbidden(`This action requires the ${minimumRole} role`)
    }
    return profile
  }
}
