import type { FastifyReply, FastifyRequest, onRequestAsyncHookHandler } from 'fastify'
import type { TokenVerifier } from '../lib/auth/token-verifier.js'
import { InvalidTokenError } from '../lib/auth/token-verifier.js'
import { unauthenticated } from '../lib/errors.js'
import type { AuthService } from '../modules/auth/auth.service.js'
import type { AdminRole } from '../modules/auth/auth.types.js'

/**
 * Route guards. Usage:
 *
 *   app.get('/x', { onRequest: app.guards.requireAuth() }, handler)
 *   app.get('/y', { onRequest: app.guards.requireAdmin() }, handler)
 *   app.delete('/z', { onRequest: app.guards.requireAdmin('admin') }, handler)
 *
 * Identity comes ONLY from the verified bearer token; the admin role comes
 * ONLY from the admin_profiles table. Nothing in the request body, query or
 * custom headers is ever used for either.
 */
export interface AuthGuards {
  requireAuth(): onRequestAsyncHookHandler[]
  requireAdmin(minimumRole?: AdminRole): onRequestAsyncHookHandler[]
}

const BEARER_PATTERN = /^Bearer ([A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]*)$/i
const MAX_TOKEN_LENGTH = 8192

export function extractBearerToken(header: string | undefined): string | null {
  if (!header || header.length > MAX_TOKEN_LENGTH + 7) return null
  const match = BEARER_PATTERN.exec(header.trim())
  return match?.[1] ?? null
}

export function createAuthGuards(deps: { tokenVerifier: TokenVerifier; authService: AuthService }): AuthGuards {
  async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
    const token = extractBearerToken(request.headers.authorization)
    if (!token) throw unauthenticated('Missing or malformed Authorization header')

    try {
      request.auth = await deps.tokenVerifier.verify(token)
    } catch (error) {
      if (error instanceof InvalidTokenError) throw unauthenticated(error.message)
      throw error
    }
  }

  return {
    requireAuth: () => [authenticate],
    requireAdmin: (minimumRole: AdminRole = 'staff') => [
      authenticate,
      async (request) => {
        request.admin = await deps.authService.requireAdmin(request.auth!.userId, minimumRole)
      },
    ],
  }
}
