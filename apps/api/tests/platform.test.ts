import { beforeEach, describe, expect, it } from 'vitest'
import { parseConfig } from '../src/app/config.js'
import { createImageKitClient } from '../src/lib/imagekit.js'
import { percentChange } from '../src/modules/dashboard/dashboard.service.js'
import { bearer, buildTestApp, IDS, orderRecord } from './helpers.js'
import type { TestApp } from './helpers.js'

let t: TestApp
beforeEach(async () => {
  t = await buildTestApp()
})

describe('error handling and response format', () => {
  it('returns the error envelope for unknown routes', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/nope?x=1' })
    expect(res.statusCode).toBe(404)
    expect(res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Route GET /api/nope not found' } })
  })

  it('returns 400 for malformed JSON', async () => {
    const res = await t.app.inject({
      method: 'POST',
      url: '/api/store/orders',
      headers: { 'content-type': 'application/json' },
      payload: '{"items": [',
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('BAD_REQUEST')
  })

  it('hides internal errors from clients in production', async () => {
    const prod = await buildTestApp({ NODE_ENV: 'production', CORS_ORIGIN: 'https://admin.example.com' })
    prod.repos.categories.listActive.mockRejectedValue(new Error('relation "categories" does not exist'))
    const res = await prod.app.inject({ method: 'GET', url: '/api/store/categories' })
    expect(res.statusCode).toBe(500)
    expect(res.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } })
    expect(res.body).not.toContain('relation')
  })

  it('sets security headers and a request id', async () => {
    t.repos.categories.listActive.mockResolvedValue([])
    const res = await t.app.inject({ method: 'GET', url: '/api/store/categories', headers: { 'x-request-id': 'req-123' } })
    expect(res.headers['x-content-type-options']).toBe('nosniff')
    expect(res.headers['x-request-id']).toBe('req-123')
  })

  it('only allows configured CORS origins in production', async () => {
    const prod = await buildTestApp({ NODE_ENV: 'production', CORS_ORIGIN: 'https://admin.example.com,https://shop.example.com' })
    prod.repos.categories.listActive.mockResolvedValue([])
    const allowed = await prod.app.inject({ method: 'GET', url: '/api/store/categories', headers: { origin: 'https://shop.example.com' } })
    expect(allowed.headers['access-control-allow-origin']).toBe('https://shop.example.com')
    const denied = await prod.app.inject({ method: 'GET', url: '/api/store/categories', headers: { origin: 'https://evil.example.com' } })
    expect(denied.headers['access-control-allow-origin']).toBeUndefined()
  })
})

describe('configuration', () => {
  const base = {
    DATABASE_URL: 'postgres://u:p@localhost/db',
    SUPABASE_URL: 'https://p.supabase.co',
    IMAGEKIT_PUBLIC_KEY: 'pub',
    IMAGEKIT_PRIVATE_KEY: 'priv',
    IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/x/',
  }

  it('fails fast with a readable message when required variables are missing', () => {
    expect(() => parseConfig({})).toThrow(/DATABASE_URL/)
  })

  it('requires an explicit CORS allow-list in production', () => {
    expect(() => parseConfig({ ...base, NODE_ENV: 'production' })).toThrow(/CORS_ORIGIN/)
  })

  it('normalises values and disables API docs in production by default', () => {
    const config = parseConfig({ ...base, NODE_ENV: 'production', CORS_ORIGIN: 'https://a.com, https://b.com' })
    expect(config.imagekit.urlEndpoint).toBe('https://ik.imagekit.io/x')
    expect(config.cors.origins).toEqual(['https://a.com', 'https://b.com'])
    expect(config.apiDocsEnabled).toBe(false)
  })
})

describe('ImageKit upload auth', () => {
  it('returns short-lived signed credentials without the private key', async () => {
    const res = await t.app.inject({ method: 'GET', url: '/api/admin/uploads/imagekit-auth', headers: bearer('admin') })
    expect(res.statusCode).toBe(200)
    expect(Object.keys(res.json().data).sort()).toEqual(['expire', 'folder', 'publicKey', 'signature', 'token', 'urlEndpoint'])
    expect(res.body).not.toContain('private_test_secret')
    expect(res.headers['cache-control']).toBe('no-store')
  })

  it('signs token+expire with HMAC-SHA1 of the private key, as ImageKit expects', async () => {
    const { createHmac } = await import('node:crypto')
    const client = createImageKitClient({ publicKey: 'pub', privateKey: 'secret', urlEndpoint: 'https://ik.imagekit.io/x', uploadFolder: '/p' })
    const auth = client.createUploadAuth()
    expect(auth.signature).toBe(createHmac('sha1', 'secret').update(`${auth.token}${auth.expire}`).digest('hex'))
    expect(auth.expire).toBeGreaterThan(Date.now() / 1000)
    expect(auth.expire).toBeLessThanOrEqual(Date.now() / 1000 + 3600)
  })

  it('treats a 404 from ImageKit as an already-deleted file', async () => {
    const fetchStub = (async () => new Response(null, { status: 404 })) as typeof fetch
    const client = createImageKitClient({ publicKey: 'pub', privateKey: 'secret', urlEndpoint: 'https://ik.imagekit.io/x', uploadFolder: '/p' }, fetchStub)
    await expect(client.deleteFile('gone')).resolves.toBeUndefined()
  })
})

describe('dashboard', () => {
  it('returns server-side aggregates and recent orders', async () => {
    t.repos.dashboard.aggregates.mockResolvedValue({
      totalProducts: 40, publishedProducts: 32, lowStockProducts: 3,
      totalOrders: 120, pendingOrders: 7, processingOrders: 4, shippedOrders: 9, completedOrders: 95, cancelledOrders: 5,
      totalRevenue: 12345.67, revenueLast30Days: 1500, revenuePrevious30Days: 1200, totalCustomers: 88,
    })
    const recent = orderRecord()
    t.repos.orders.list.mockResolvedValue({ items: [{ ...recent, itemCount: 2 }], total: 1 })

    const res = await t.app.inject({ method: 'GET', url: '/api/admin/dashboard', headers: bearer('staff') })

    expect(res.statusCode).toBe(200)
    expect(res.json().data).toMatchObject({
      products: { total: 40, published: 32, lowStock: 3 },
      orders: { total: 120, pending: 7, completed: 95 },
      revenue: { total: 12345.67, last30Days: 1500, previous30Days: 1200, changePct: 25 },
      customers: { total: 88 },
      recentOrders: [{ id: IDS.order, orderNumber: 'ORD-001001', itemCount: 2 }],
    })
    expect(t.repos.orders.list).toHaveBeenCalledWith(expect.anything(), { sort: 'created-desc' }, { page: 1, pageSize: 5 })
  })

  it('computes percentage change safely', () => {
    expect(percentChange(150, 100)).toBe(50)
    expect(percentChange(0, 0)).toBe(0)
    expect(percentChange(10, 0)).toBeNull()
    expect(percentChange(50, 150)).toBe(-66.7)
  })
})

describe('customers', () => {
  it('lists customers for admins only', async () => {
    t.repos.customers.list.mockResolvedValue({
      items: [{ id: IDS.customer, fullName: 'Jane', email: 'jane@example.com', phone: null, ordersCount: 2, totalSpent: 80, lastOrderAt: new Date('2026-09-10T00:00:00Z'), createdAt: new Date('2026-01-01T00:00:00Z') }],
      total: 1,
    })
    expect((await t.app.inject({ method: 'GET', url: '/api/admin/customers' })).statusCode).toBe(401)
    const res = await t.app.inject({ method: 'GET', url: '/api/admin/customers?search=jane', headers: bearer('staff') })
    expect(res.statusCode).toBe(200)
    expect(res.json().data[0]).toMatchObject({ email: 'jane@example.com', ordersCount: 2, totalSpent: 80 })
  })
})
