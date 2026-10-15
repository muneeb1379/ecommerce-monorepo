import { http, HttpResponse } from 'msw'
import type {
  DashboardMetrics,
  OrderStatus,
  Paginated,
  Product,
  ProductInput,
  ProductStatus,
} from '@/types/api'
import {
  mockAdminProfile,
  mockCategories,
  mockCustomers,
  mockOrderListItems,
  mockOrders,
  mockProductListItems,
  mockProducts,
} from './data'

/**
 * In-memory mock API server used when VITE_API_MOCK=true. Mirrors the
 * real Node.js API contract in src/lib/api/* exactly, so switching
 * VITE_API_MOCK off (and pointing VITE_API_BASE_URL at the real
 * server) requires no frontend code changes.
 */

function paginate<T>(items: T[], page: number, pageSize: number): Paginated<T> {
  const start = (page - 1) * pageSize
  const totalItems = items.length
  return {
    items: items.slice(start, start + pageSize),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  }
}

function num(searchParams: URLSearchParams, key: string, fallback: number) {
  const raw = searchParams.get(key)
  const parsed = raw ? Number(raw) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

export const handlers = [
  http.get('*/auth/me', () => HttpResponse.json(mockAdminProfile)),

  http.get('*/dashboard/metrics', () => {
    const totalRevenue = mockOrders
      .filter((o) => o.paymentStatus === 'paid')
      .reduce((sum, o) => sum + o.total, 0)

    const metrics: DashboardMetrics = {
      totalOrders: mockOrders.length,
      pendingOrders: mockOrders.filter((o) => o.status === 'pending').length,
      completedOrders: mockOrders.filter((o) => o.status === 'delivered').length,
      totalProducts: mockProducts.length,
      totalRevenue: Number(totalRevenue.toFixed(2)),
      revenueChangePct: 8.4,
      recentOrders: mockOrderListItems.slice(0, 5),
    }
    return HttpResponse.json(metrics)
  }),

  http.get('*/products/categories', () => HttpResponse.json(mockCategories)),

  http.get('*/products', ({ request }) => {
    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const status = url.searchParams.get('status') ?? 'all'
    const category = url.searchParams.get('category') ?? 'all'
    const sort = url.searchParams.get('sort') ?? 'updated-desc'
    const page = num(url.searchParams, 'page', 1)
    const pageSize = num(url.searchParams, 'pageSize', 20)

    let items = mockProductListItems.filter((p) => {
      if (search && !p.name.toLowerCase().includes(search) && !p.sku.toLowerCase().includes(search)) {
        return false
      }
      if (status !== 'all' && p.status !== status) return false
      if (category !== 'all' && p.category !== category) return false
      return true
    })

    items = [...items].sort((a, b) => {
      switch (sort) {
        case 'name-asc':
          return a.name.localeCompare(b.name)
        case 'name-desc':
          return b.name.localeCompare(a.name)
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        default:
          return b.updatedAt.localeCompare(a.updatedAt)
      }
    })

    return HttpResponse.json(paginate(items, page, pageSize))
  }),

  http.get('*/products/:id', ({ params }) => {
    const product = mockProducts.find((p) => p.id === params.id)
    if (!product) return HttpResponse.json({ message: 'Product not found' }, { status: 404 })
    return HttpResponse.json(product)
  }),

  http.post('*/products', async ({ request }) => {
    const input = (await request.json()) as ProductInput
    const id = `p${mockProducts.length + 1}`
    const now = new Date().toISOString()
    const product: Product = {
      id,
      ...input,
      colors: input.colors.map((c, i) => ({
        id: c.id ?? `${id}-color-${i}`,
        name: c.name,
        hex: c.hex,
        position: c.position,
        defaultImageId: c.defaultImageId,
        images: c.images.map((img, j) => ({
          id: img.id ?? `${id}-img-${i}-${j}`,
          url: img.url,
          thumbUrl: img.thumbUrl,
          fileId: img.fileId,
          position: img.position,
          alt: img.alt,
        })),
      })),
      createdAt: now,
      updatedAt: now,
    }
    mockProducts.push(product)
    mockProductListItems.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      status: product.status,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      stock: product.stock,
      category: product.category,
      primaryImageUrl: product.colors[0]?.images[0]?.url ?? null,
      colorCount: product.colors.length,
      updatedAt: product.updatedAt,
    })
    return HttpResponse.json(product, { status: 201 })
  }),

  http.patch('*/products/:id', async ({ params, request }) => {
    const index = mockProducts.findIndex((p) => p.id === params.id)
    if (index === -1) return HttpResponse.json({ message: 'Product not found' }, { status: 404 })
    const input = (await request.json()) as ProductInput
    const existing = mockProducts[index]
    const updated: Product = {
      ...existing,
      ...input,
      colors: input.colors.map((c, i) => ({
        id: c.id ?? `${existing.id}-color-${i}`,
        name: c.name,
        hex: c.hex,
        position: c.position,
        defaultImageId: c.defaultImageId,
        images: c.images.map((img, j) => ({
          id: img.id ?? `${existing.id}-img-${i}-${j}`,
          url: img.url,
          thumbUrl: img.thumbUrl,
          fileId: img.fileId,
          position: img.position,
          alt: img.alt,
        })),
      })),
      updatedAt: new Date().toISOString(),
    }
    mockProducts[index] = updated

    const listIndex = mockProductListItems.findIndex((p) => p.id === params.id)
    if (listIndex !== -1) {
      mockProductListItems[listIndex] = {
        id: updated.id,
        name: updated.name,
        slug: updated.slug,
        sku: updated.sku,
        status: updated.status,
        price: updated.price,
        compareAtPrice: updated.compareAtPrice,
        stock: updated.stock,
        category: updated.category,
        primaryImageUrl: updated.colors[0]?.images[0]?.url ?? null,
        colorCount: updated.colors.length,
        updatedAt: updated.updatedAt,
      }
    }
    return HttpResponse.json(updated)
  }),

  http.patch('*/products/:id/status', async ({ params, request }) => {
    const { status } = (await request.json()) as { status: ProductStatus }
    const product = mockProducts.find((p) => p.id === params.id)
    const listItem = mockProductListItems.find((p) => p.id === params.id)
    if (!product || !listItem) return HttpResponse.json({ message: 'Product not found' }, { status: 404 })
    product.status = status
    listItem.status = status
    return HttpResponse.json(product)
  }),

  http.delete('*/products/:id', ({ params }) => {
    const index = mockProducts.findIndex((p) => p.id === params.id)
    if (index !== -1) mockProducts.splice(index, 1)
    const listIndex = mockProductListItems.findIndex((p) => p.id === params.id)
    if (listIndex !== -1) mockProductListItems.splice(listIndex, 1)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('*/orders', ({ request }) => {
    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const status = url.searchParams.get('status') ?? 'all'
    const paymentStatus = url.searchParams.get('paymentStatus') ?? 'all'
    const page = num(url.searchParams, 'page', 1)
    const pageSize = num(url.searchParams, 'pageSize', 20)

    const items = mockOrderListItems.filter((o) => {
      if (
        search &&
        !o.orderNumber.toLowerCase().includes(search) &&
        !o.customerName.toLowerCase().includes(search)
      ) {
        return false
      }
      if (status !== 'all' && o.status !== status) return false
      if (paymentStatus !== 'all' && o.paymentStatus !== paymentStatus) return false
      return true
    })

    return HttpResponse.json(paginate(items, page, pageSize))
  }),

  http.get('*/orders/:id', ({ params }) => {
    const order = mockOrders.find((o) => o.id === params.id)
    if (!order) return HttpResponse.json({ message: 'Order not found' }, { status: 404 })
    return HttpResponse.json(order)
  }),

  http.patch('*/orders/:id/status', async ({ params, request }) => {
    const { status } = (await request.json()) as { status: OrderStatus }
    const order = mockOrders.find((o) => o.id === params.id)
    const listItem = mockOrderListItems.find((o) => o.id === params.id)
    if (!order || !listItem) return HttpResponse.json({ message: 'Order not found' }, { status: 404 })
    order.status = status
    order.updatedAt = new Date().toISOString()
    listItem.status = status
    return HttpResponse.json(order)
  }),

  http.get('*/customers', ({ request }) => {
    const url = new URL(request.url)
    const search = (url.searchParams.get('search') ?? '').toLowerCase()
    const page = num(url.searchParams, 'page', 1)
    const pageSize = num(url.searchParams, 'pageSize', 20)

    const items = mockCustomers.filter(
      (c) => !search || c.fullName.toLowerCase().includes(search) || c.email.toLowerCase().includes(search),
    )

    return HttpResponse.json(paginate(items, page, pageSize))
  }),

  http.get('*/imagekit/auth', () =>
    HttpResponse.json({
      token: crypto.randomUUID(),
      expire: Math.floor(Date.now() / 1000) + 600,
      signature: 'mock-signature',
      publicKey: 'mock-public-key',
      urlEndpoint: 'https://ik.imagekit.io/mock',
    }),
  ),

  // Mocks the ImageKit upload endpoint itself so the full upload flow
  // (including progress) works without real ImageKit credentials.
  http.post('https://upload.imagekit.io/api/v1/files/upload', async () => {
    await new Promise((resolve) => setTimeout(resolve, 600))
    const seed = crypto.randomUUID()
    return HttpResponse.json({
      fileId: `mock-${seed}`,
      url: `https://picsum.photos/seed/${seed}/600/600`,
      thumbnailUrl: `https://picsum.photos/seed/${seed}/200/200`,
      name: `${seed}.jpg`,
    })
  }),
]
