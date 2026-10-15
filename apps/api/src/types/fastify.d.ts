import type { AuthGuards } from '../middleware/auth.js'
import type { AdminProfile } from '../modules/auth/auth.types.js'
import type { VerifiedToken } from '../lib/auth/token-verifier.js'

declare module 'fastify' {
  interface FastifyInstance {
    guards: AuthGuards
  }

  interface FastifyRequest {
    /** Set by requireAuth() after the bearer token is verified. */
    auth: VerifiedToken | null
    /** Set by requireAdmin() after the admin profile is loaded from the database. */
    admin: AdminProfile | null
  }
}
