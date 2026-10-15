import { SignJWT } from 'jose'
import { beforeEach, describe, expect, it } from 'vitest'
import { createSupabaseTokenVerifier, InvalidTokenError } from '../src/lib/auth/token-verifier.js'
import { extractBearerToken } from '../src/middleware/auth.js'
import { hasRole } from '../src/modules/auth/permissions.js'
import { bearer, buildTestApp, USERS } from './helpers.js'
import type { TestApp } from './helpers.js'

describe('authentication middleware (requireAuth)', () => {
  let t: TestApp
  beforeEach(async () => {
    t = await buildTestApp()
  })

  it('rejects requests without an Authorization header', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/auth/me' })
    expect(res.statusCode).toBe(401)
    expect(res.json()).toEqual({
      error: { code: 'UNAUTHENTICATED', message: 'Missing or malformed Authorization header' },
    })
  })

  it('rejects non-Bearer schemes and malformed tokens', async () => {
    for (const authorization of ['Basic dXNlcjpwYXNz', 'Bearer', 'Bearer not-a-jwt', 'Token a.b.c']) {
      const res = await t.app.inject({ method: 'GET', url: '/api/auth/me', headers: { authorization } })
      expect({ authorization, status: res.statusCode }).toEqual({ authorization, status: 401 })
    }
    expect(t.tokenVerifier.verify).not.toHaveBeenCalled()
  })

  it('rejects tokens the verifier does not accept', async () => {
    const res = await t.app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: 'Bearer forged.token.value' },
    })
    expect(res.statusCode).toBe(401)
    expect(res.json().error.code).toBe('UNAUTHENTICATED')
  })

  it('does not require authentication on storefront routes', async () => {
    t.repos.categories.listActive.mockResolvedValue([])
    const res = await t.app.inject({ method: 'GET', url: '/api/store/categories' })
    expect(res.statusCode).toBe(200)
  })
})

describe('authorization middleware (requireAdmin)', () => {
  let t: TestApp
  beforeEach(async () => {
    t = await buildTestApp()
  })

  it('returns the admin profile for an active admin', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/auth/me', headers: bearer('staff') })
    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({ id: USERS.staff, role: 'staff', email: 'staff@example.com' })
    expect(res.json().data).not.toHaveProperty('isActive')
  })

  it('forbids authenticated users without an admin profile', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/auth/me', headers: bearer('customer') })
    expect(res.statusCode).toBe(403)
    expect(res.json().error.code).toBe('FORBIDDEN')
  })

  it('forbids deactivated admins immediately', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/admin/orders', headers: bearer('inactive') })
    expect(res.statusCode).toBe(403)
  })

  it('enforces the minimum role per route', async () => {
    const body = { name: 'X', slug: 'x', price: 10, sku: 'X-1' }
    const staff = await t.app.inject({ method: 'POST', url: '/api/admin/products', headers: bearer('staff'), payload: body })
    expect(staff.statusCode).toBe(403)
    expect(staff.json().error.message).toMatch(/admin role/)

    const uploads = await t.app.inject({ method: 'GET', url: '/api/admin/uploads/imagekit-auth', headers: bearer('staff') })
    expect(uploads.statusCode).toBe(403)
  })

  it('ignores role and user id claims sent by the client', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/admin/products',
      headers: { ...bearer('staff'), 'x-admin-role': 'owner', 'x-user-id': USERS.owner },
      payload: { name: 'X', slug: 'x', price: 10, sku: 'X-1', role: 'owner', userId: USERS.owner },
    })
    expect(res.statusCode).toBe(403)
    expect(t.repos.auth.findAdminProfileById).toHaveBeenCalledWith(expect.anything(), USERS.staff)
  })

  it('authenticates before validating input, so anonymous callers learn nothing', async () => {
    const res = await t.app.inject({ method: 'POST', url: '/api/admin/products', payload: { bogus: true } })
    expect(res.statusCode).toBe(401)
  })
})

describe('role hierarchy', () => {
  it('orders roles owner > admin > staff', () => {
    expect(hasRole('owner', 'admin')).toBe(true)
    expect(hasRole('admin', 'admin')).toBe(true)
    expect(hasRole('staff', 'admin')).toBe(false)
    expect(hasRole('admin', 'owner')).toBe(false)
  })
})

describe('extractBearerToken', () => {
  it('accepts a well-formed bearer JWT and nothing else', () => {
    expect(extractBearerToken('Bearer aaa.bbb.ccc')).toBe('aaa.bbb.ccc')
    expect(extractBearerToken('bearer aaa.bbb.ccc')).toBe('aaa.bbb.ccc')
    expect(extractBearerToken(undefined)).toBeNull()
    expect(extractBearerToken('Bearer aaa.bbb')).toBeNull()
    expect(extractBearerToken('Bearer aaa.bbb.ccc extra')).toBeNull()
    expect(extractBearerToken(`Bearer ${'a'.repeat(9000)}.b.c`)).toBeNull()
  })
})

describe('Supabase token verification', () => {
  const supabaseUrl = 'https://project.supabase.co'
  const secret = 'test-jwt-secret-that-is-at-least-32-chars'
  const verifier = createSupabaseTokenVerifier({ supabaseUrl, jwtSecret: secret })
  const key = new TextEncoder().encode(secret)

  const sign = (claims: Record<string, unknown>, options: { issuer?: string; audience?: string; exp?: string } = {}) =>
    new SignJWT({ role: 'authenticated', email: 'a@example.com', ...claims })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USERS.admin)
      .setIssuer(options.issuer ?? `${supabaseUrl}/auth/v1`)
      .setAudience(options.audience ?? 'authenticated')
      .setIssuedAt()
      .setExpirationTime(options.exp ?? '5m')
      .sign(key)

  it('accepts a valid token and returns the user id from `sub`', async () => {
    await expect(verifier.verify(await sign({}))).resolves.toMatchObject({ userId: USERS.admin, email: 'a@example.com' })
  })

  it('rejects wrong issuer, wrong audience, expired and anonymous tokens', async () => {
    const bad = [
      await sign({}, { issuer: 'https://evil.example.com/auth/v1' }),
      await sign({}, { audience: 'service_role' }),
      await sign({}, { exp: '-1m' }),
      await sign({ is_anonymous: true }),
      await sign({ role: 'anon' }),
    ]
    for (const token of bad) {
      await expect(verifier.verify(token)).rejects.toBeInstanceOf(InvalidTokenError)
    }
  })

  it('rejects tokens signed with a different secret', async () => {
    const forged = await new SignJWT({ role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(USERS.owner)
      .setIssuer(`${supabaseUrl}/auth/v1`)
      .setAudience('authenticated')
      .setExpirationTime('5m')
      .sign(new TextEncoder().encode('another-secret-another-secret-another'))
    await expect(verifier.verify(forged)).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('rejects HS256 tokens when no JWT secret is configured', async () => {
    const jwksOnly = createSupabaseTokenVerifier({ supabaseUrl })
    await expect(jwksOnly.verify(await sign({}))).rejects.toBeInstanceOf(InvalidTokenError)
  })
})
