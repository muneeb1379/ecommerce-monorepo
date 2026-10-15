import { createRemoteJWKSet, decodeProtectedHeader, errors as joseErrors, jwtVerify } from 'jose'
import type { JWTPayload } from 'jose'

/**
 * Verifies Supabase Auth access tokens locally (no network round-trip per
 * request once the signing keys are cached).
 *
 * - Asymmetric tokens (ES256/RS256, Supabase "JWT signing keys") are verified
 *   against the project's JWKS endpoint.
 * - Legacy HS256 tokens are verified with SUPABASE_JWT_SECRET when configured.
 *
 * Issuer, audience and expiry are always enforced. See
 * docs/architecture/authentication.md.
 */

export interface VerifiedToken {
  userId: string
  email: string | null
  sessionId: string | null
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedToken>
}

export class InvalidTokenError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidTokenError'
  }
}

interface SupabaseClaims extends JWTPayload {
  email?: string
  session_id?: string
  role?: string
  is_anonymous?: boolean
}

export function createSupabaseTokenVerifier(options: {
  supabaseUrl: string
  jwtSecret?: string | undefined
}): TokenVerifier {
  const issuer = `${options.supabaseUrl}/auth/v1`
  const jwks = createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`), {
    cacheMaxAge: 10 * 60 * 1000,
    cooldownDuration: 30 * 1000,
  })
  const secret = options.jwtSecret ? new TextEncoder().encode(options.jwtSecret) : null
  const verifyOptions = { issuer, audience: 'authenticated', clockTolerance: 5 }

  return {
    async verify(token) {
      let alg: string | undefined
      try {
        alg = decodeProtectedHeader(token).alg
      } catch {
        throw new InvalidTokenError('Malformed token')
      }

      let payload: SupabaseClaims
      try {
        if (alg === 'HS256') {
          if (!secret) throw new InvalidTokenError('HS256 tokens are not accepted')
          payload = (await jwtVerify<SupabaseClaims>(token, secret, { ...verifyOptions, algorithms: ['HS256'] }))
            .payload
        } else {
          payload = (
            await jwtVerify<SupabaseClaims>(token, jwks, { ...verifyOptions, algorithms: ['ES256', 'RS256'] })
          ).payload
        }
      } catch (error) {
        if (error instanceof InvalidTokenError) throw error
        if (error instanceof joseErrors.JWTExpired) throw new InvalidTokenError('Token expired')
        if (error instanceof joseErrors.JOSEError) throw new InvalidTokenError('Invalid token')
        // Network failure fetching JWKS etc. — not the client's fault.
        throw error
      }

      if (!payload.sub) throw new InvalidTokenError('Token has no subject')
      if (payload.role !== 'authenticated' || payload.is_anonymous) {
        throw new InvalidTokenError('Token does not belong to an authenticated user')
      }

      return {
        userId: payload.sub,
        email: payload.email ?? null,
        sessionId: payload.session_id ?? null,
      }
    },
  }
}
