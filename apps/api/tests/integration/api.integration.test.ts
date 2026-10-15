/**
 * End-to-end tests against a real Postgres: real repositories, SQL,
 * transactions and constraints; fake token verifier and ImageKit.
 *
 * Skipped unless TEST_DATABASE_URL points at a disposable database with
 * migrations applied (see docs/development/setup.md#integration-tests).
 * THE TEST TRUNCATES ALL TABLES.
 */
import type { FastifyInstance } from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../../src/app/server.js'
import { createDatabase } from '../../src/lib/db.js'
import type { Database } from '../../src/lib/db.js'
import { bearer, fakeImageKit, fakeTokenVerifier, IMAGEKIT_ENDPOINT, testConfig, USERS } from '../helpers.js'

const url = process.env.TEST_DATABASE_URL

describe.skipIf(!url)('API against a real database', () => {
  let db: Database
  let app: FastifyInstance
  let imagekit: ReturnType<typeof fakeImageKit>

  const img = (fileId: string, extra: Record<string, unknown> = {}) => ({
    imageUrl: `${IMAGEKIT_ENDPOINT}/products/${fileId}.jpg`,
    imageKitFileId: fileId,
    ...extra,
  })

  const call = async (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', path: string, payload?: unknown, who: 'admin' | 'staff' | null = 'admin') => {
    const res = await app.inject({ method, url: path, payload: payload as never, headers: who ? bearer(who) : {} })
    return { status: res.statusCode, body: res.body ? res.json() : null }
  }

  beforeAll(async () => {
    db = createDatabase({ url: url!, poolMax: 5, ssl: false })
    await db.sql`
      truncate order_status_history, order_items, orders, addresses, customers, pending_asset_deletions,
               product_images, product_colors, products, categories, admin_profiles cascade
    `
    await db.sql`delete from auth.users`
    await db.sql`
      insert into auth.users (id, email) values
        (${USERS.admin}, 'admin@example.com'), (${USERS.staff}, 'staff@example.com')
    `
    await db.sql`
      insert into admin_profiles (id, email, full_name, role) values
        (${USERS.admin}, 'admin@example.com', 'Ada Admin', 'admin'),
        (${USERS.staff}, 'staff@example.com', 'Sam Staff', 'staff')
    `
    imagekit = fakeImageKit()
    ;({ app } = await buildApp(testConfig(), { db, tokenVerifier: fakeTokenVerifier(), imagekit }))
    await app.ready()
  })

  afterAll(async () => {
    await app?.close()
    await db?.close()
  })

  let categoryId: string
  let productId: string
  let blackId: string
  let whiteId: string

  it('creates a category and a product with colors and images in one request', async () => {
    const category = await call('POST', '/api/admin/categories', { name: 'T-Shirts', slug: 't-shirts' })
    expect(category.status).toBe(201)
    categoryId = category.body.data.id

    const created = await call('POST', '/api/admin/products', {
      name: 'Classic T Shirt',
      slug: 'classic-t-shirt',
      description: 'Soft cotton',
      price: 19.99,
      compareAtPrice: 24.99,
      sku: 'TSHIRT-001',
      categoryId,
      stock: 5,
      colors: [
        { name: 'Black', hexValue: '#000', images: [img('black-1'), img('black-2', { isPrimary: true })] },
        { name: 'White', hexValue: '#ffffff', images: [img('white-1')] },
      ],
    })
    expect(created.status).toBe(201)
    const product = created.body.data
    productId = product.id
    blackId = product.colors[0].id
    whiteId = product.colors[1].id

    expect(product).toMatchObject({ status: 'draft', price: 19.99, compareAtPrice: 24.99, category: { slug: 't-shirts' } })
    expect(product.colors.map((c: { name: string; hexValue: string }) => [c.name, c.hexValue])).toEqual([
      ['Black', '#000'],
      ['White', '#FFFFFF'],
    ])
    expect(product.colors[0].images.map((i: { imageKitFileId: string; isPrimary: boolean }) => [i.imageKitFileId, i.isPrimary])).toEqual([
      ['black-1', false],
      ['black-2', true],
    ])
    expect(product.colors[0].primaryImageId).toBe(product.colors[0].images[1].id)
  })

  it('rolls back the whole create when a nested insert fails', async () => {
    const res = await call('POST', '/api/admin/products', {
      name: 'Dup image',
      slug: 'dup-image',
      price: 10,
      sku: 'DUP-1',
      colors: [{ name: 'Red', hexValue: '#FF0000', images: [img('black-1')] }], // file already used
    })
    expect(res.status).toBe(409)
    const [row] = await db.sql`select count(*)::int as n from products where slug = 'dup-image'`
    expect(row!.n).toBe(0)
  })

  it('rejects duplicate slugs with 409', async () => {
    const res = await call('POST', '/api/admin/products', { name: 'Other', slug: 'classic-t-shirt', price: 10, sku: 'OTHER-1' })
    expect(res.status).toBe(409)
    expect(res.body.error.message).toBe('A product with this slug already exists')
  })

  it('hides drafts from the storefront until published', async () => {
    expect((await call('GET', '/api/store/products/classic-t-shirt', undefined, null)).status).toBe(404)
    const published = await call('PATCH', `/api/admin/products/${productId}`, { status: 'published' })
    expect(published.status).toBe(200)
    expect(published.body.data.publishedAt).not.toBeNull()
  })

  it('returns the storefront product with all colors and images in one query', async () => {
    const res = await call('GET', '/api/store/products/classic-t-shirt', undefined, null)
    expect(res.status).toBe(200)
    const product = res.body.data
    expect(product).toMatchObject({ name: 'Classic T Shirt', price: 19.99, inStock: true, currency: 'USD', category: { name: 'T-Shirts', slug: 't-shirts' } })
    expect(product.colors).toHaveLength(2)
    expect(product.colors[0].images[1]).toMatchObject({ url: `${IMAGEKIT_ENDPOINT}/products/black-2.jpg`, isPrimary: true })
    expect(JSON.stringify(product)).not.toContain('imageKitFileId')
  })

  it('lists, searches and filters storefront products', async () => {
    const list = await call('GET', '/api/store/products?category=t-shirts&search=classic&sort=price-asc', undefined, null)
    expect(list.status).toBe(200)
    expect(list.body.pagination).toEqual({ page: 1, pageSize: 20, total: 1, totalPages: 1 })
    expect(list.body.data[0]).toMatchObject({
      slug: 'classic-t-shirt',
      imageUrl: `${IMAGEKIT_ENDPOINT}/products/black-2.jpg`,
      colors: [
        { id: blackId, name: 'Black', hexValue: '#000' },
        { id: whiteId, name: 'White', hexValue: '#FFFFFF' },
      ],
    })
    const none = await call('GET', '/api/store/products?search=100%25_off', undefined, null)
    expect(none.body.data).toEqual([])
  })

  it('manages colors and images, keeping exactly one primary per color', async () => {
    const color = await call('POST', `/api/admin/products/${productId}/colors`, { name: 'Blue', hexValue: '#1e3a8a', images: [img('blue-1')] })
    expect(color.status).toBe(201)
    const blueId = color.body.data.id
    expect(color.body.data).toMatchObject({ sortOrder: 2, hexValue: '#1E3A8A' })

    const added = await call('POST', `/api/admin/products/${productId}/colors/${blueId}/images`, img('blue-2', { isPrimary: true, alt: 'Back' }))
    expect(added.status).toBe(201)
    expect(added.body.data).toMatchObject({ isPrimary: true, sortOrder: 1, alt: 'Back' })

    const primaries = await db.sql`
      select count(*)::int as n from product_images where product_color_id = ${blueId} and is_primary
    `
    expect(primaries[0]!.n).toBe(1)

    // Deleting the primary promotes the next image and removes the ImageKit file.
    const del = await call('DELETE', `/api/admin/products/${productId}/colors/${blueId}/images/${added.body.data.id}`)
    expect(del.status).toBe(204)
    expect(imagekit.deleteFile).toHaveBeenCalledWith('blue-2')
    const [remaining] = await db.sql`
      select imagekit_file_id, is_primary from product_images where product_color_id = ${blueId}
    `
    expect(remaining).toMatchObject({ imagekitFileId: 'blue-1', isPrimary: true })
    const [queue] = await db.sql`select count(*)::int as n from pending_asset_deletions`
    expect(queue!.n).toBe(0)

    // Deleting again is idempotent.
    expect((await call('DELETE', `/api/admin/products/${productId}/colors/${blueId}/images/${added.body.data.id}`)).status).toBe(204)

    // The last image of a color on a published product cannot be removed.
    const [last] = await db.sql`select id from product_images where product_color_id = ${blueId}`
    const blocked = await call('DELETE', `/api/admin/products/${productId}/colors/${blueId}/images/${last!.id}`)
    expect(blocked.status).toBe(422)

    expect((await call('DELETE', `/api/admin/products/${productId}/colors/${blueId}`)).status).toBe(204)
  })

  it('keeps failed ImageKit deletions queued for retry', async () => {
    const color = await call('POST', `/api/admin/products/${productId}/colors`, { name: 'Green', hexValue: '#00FF00', images: [img('green-1'), img('green-2')] })
    const greenId = color.body.data.id
    imagekit.deleteFile.mockRejectedValueOnce(new Error('ImageKit unavailable'))

    const del = await call('DELETE', `/api/admin/products/${productId}/colors/${greenId}/images/${color.body.data.images[1].id}`)
    expect(del.status).toBe(204)
    const [queued] = await db.sql`select imagekit_file_id, attempts, last_error from pending_asset_deletions`
    expect(queued).toMatchObject({ imagekitFileId: 'green-2', attempts: 1, lastError: 'ImageKit unavailable' })

    await call('DELETE', `/api/admin/products/${productId}/colors/${greenId}`)
  })

  it('syncs the full color set with PATCH in one transaction', async () => {
    const before = (await call('GET', `/api/products/${productId}`, undefined, 'staff')).body.data
    const black = before.colors.find((c: { name: string }) => c.name === 'Black')
    const res = await call('PATCH', `/api/admin/products/${productId}`, {
      colors: [
        { id: black.id, name: 'Jet Black', hexValue: '#111111', images: [{ id: black.images[1].id, isPrimary: true }, img('black-3')] },
        { name: 'Red', hexValue: '#FF0000', images: [img('red-1')] },
      ],
    })
    expect(res.status).toBe(200)
    const colors = res.body.data.colors
    expect(colors.map((c: { name: string }) => c.name)).toEqual(['Jet Black', 'Red'])
    expect(colors[0].images.map((i: { imageKitFileId: string }) => i.imageKitFileId)).toEqual(['black-2', 'black-3'])
    expect(imagekit.deleteFile).toHaveBeenCalledWith('black-1')
    expect(imagekit.deleteFile).toHaveBeenCalledWith('white-1')
  })

  it('refuses to delete a category that still has products', async () => {
    const res = await call('DELETE', `/api/admin/categories/${categoryId}`)
    expect(res.status).toBe(409)
  })

  let orderId: string

  it('checks out with server-side prices, stock and snapshots', async () => {
    const product = (await call('GET', `/api/products/${productId}`, undefined, 'staff')).body.data
    const colorId = product.colors[0].id
    const res = await call(
      'POST',
      '/api/store/orders',
      {
        customer: { email: 'Jane@Example.com', fullName: 'Jane Doe' },
        shippingAddress: { line1: '1 Main St', city: 'Springfield', postalCode: '62701', country: 'us' },
        items: [{ productId, colorId, quantity: 2, price: 0.01 }],
      },
      null,
    )
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ subtotal: 39.98, shippingCost: 5, total: 44.98, orderNumber: expect.stringMatching(/^ORD-\d{6}$/) })

    const [stock] = await db.sql`select stock from products where id = ${productId}`
    expect(stock!.stock).toBe(3)

    const list = await call('GET', '/api/admin/orders?search=jane&status=pending', undefined, 'staff')
    expect(list.body.pagination.total).toBe(1)
    orderId = list.body.data[0].id
    expect(list.body.data[0]).toMatchObject({ itemCount: 2, total: 44.98, customerEmail: 'jane@example.com' })
  })

  it('rolls back a checkout that exceeds stock', async () => {
    const product = (await call('GET', `/api/products/${productId}`, undefined, 'staff')).body.data
    const res = await call(
      'POST',
      '/api/store/orders',
      {
        customer: { email: 'bob@example.com', fullName: 'Bob' },
        shippingAddress: { line1: '2 Main St', city: 'Springfield', postalCode: '62701', country: 'US' },
        items: [{ productId, colorId: product.colors[0].id, quantity: 4 }],
      },
      null,
    )
    expect(res.status).toBe(422)
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
    const [counts] = await db.sql`select (select count(*)::int from orders) as orders, (select count(*)::int from customers) as customers`
    expect(counts).toMatchObject({ orders: 1, customers: 1 })
  })

  it('keeps order snapshots when the product changes later', async () => {
    await call('PATCH', `/api/admin/products/${productId}`, { name: 'Renamed Tee', price: 99, compareAtPrice: null })
    const order = await call('GET', `/api/admin/orders/${orderId}`, undefined, 'staff')
    expect(order.status).toBe(200)
    expect(order.body.data.items[0]).toMatchObject({ productName: 'Classic T Shirt', colorName: 'Jet Black', unitPrice: 19.99, quantity: 2, subtotal: 39.98 })
    expect(order.body.data.customer).toMatchObject({ fullName: 'Jane Doe', email: 'jane@example.com' })
    expect(order.body.data.shippingAddress).toMatchObject({ line1: '1 Main St', country: 'US' })
  })

  it('moves the order through its lifecycle and restocks on cancel', async () => {
    expect((await call('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'shipped' }, 'staff')).status).toBe(422)
    const processing = await call('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'processing' }, 'staff')
    expect(processing.body.data.allowedTransitions).toEqual(['shipped', 'cancelled'])

    const cancelled = await call('PATCH', `/api/admin/orders/${orderId}/status`, { status: 'cancelled', note: 'Customer request' }, 'staff')
    expect(cancelled.status).toBe(200)
    expect(cancelled.body.data.history.map((h: { toStatus: string; changedByName: string | null }) => [h.toStatus, h.changedByName])).toEqual([
      ['pending', null],
      ['processing', 'Sam Staff'],
      ['cancelled', 'Sam Staff'],
    ])
    const [stock] = await db.sql`select stock from products where id = ${productId}`
    expect(stock!.stock).toBe(5)
  })

  it('aggregates dashboard metrics and customer stats in SQL', async () => {
    await db.sql`update orders set payment_status = 'paid', status = 'delivered' where id = ${orderId}`
    const dashboard = await call('GET', '/api/admin/dashboard', undefined, 'staff')
    expect(dashboard.status).toBe(200)
    expect(dashboard.body.data).toMatchObject({
      products: { total: 1, published: 1 },
      orders: { total: 1, completed: 1, pending: 0 },
      revenue: { total: 44.98, last30Days: 44.98, previous30Days: 0, changePct: null },
      customers: { total: 1 },
    })
    expect(dashboard.body.data.recentOrders).toHaveLength(1)

    const customers = await call('GET', '/api/admin/customers?search=jane&sort=spent-desc', undefined, 'staff')
    expect(customers.body.data[0]).toMatchObject({ email: 'jane@example.com', ordersCount: 1, totalSpent: 44.98 })
    const customer = await call('GET', `/api/admin/customers/${customers.body.data[0].id}`, undefined, 'staff')
    expect(customer.body.data.addresses).toEqual([expect.objectContaining({ line1: '1 Main St', isDefault: true })])
  })

  it('deletes a product, keeps its order history and cleans up its images', async () => {
    const res = await call('DELETE', `/api/admin/products/${productId}`)
    expect(res.status).toBe(204)
    const order = await call('GET', `/api/admin/orders/${orderId}`, undefined, 'staff')
    expect(order.body.data.items[0]).toMatchObject({ productId: null, productName: 'Classic T Shirt' })
    expect(imagekit.deleteFile).toHaveBeenCalledWith('red-1')
  })
})
