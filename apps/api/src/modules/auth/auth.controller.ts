import type { FastifyRequest } from 'fastify'
import { ok } from '../../utils/http.js'
import type { AdminProfile } from './auth.types.js'

export const toAdminProfileDto = (profile: AdminProfile) => ({
  id: profile.id,
  email: profile.email,
  fullName: profile.fullName,
  role: profile.role,
  avatarUrl: profile.avatarUrl,
  createdAt: profile.createdAt.toISOString(),
})

export const authController = {
  /** The guard already loaded the profile; this just returns it. */
  async me(request: FastifyRequest) {
    return ok(toAdminProfileDto(request.admin!))
  },
}
