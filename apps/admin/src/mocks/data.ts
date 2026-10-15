import type {
  AdminProfile,
  CustomerListItem,
  Order,
  OrderListItem,
  Product,
  ProductListItem,
} from '@/types/api'

export const mockAdminProfile: AdminProfile = {
  id: 'admin-1',
  email: 'admin@store.dev',
  fullName: 'Alex Morgan',
  role: 'owner',
  avatarUrl: null,
  createdAt: '2025-01-10T09:00:00Z',
}

const img = (seed: string, w = 600) => `https://picsum.photos/seed/${seed}/${w}/${w}`

function makeProduct(
  id: string,
  name: string,
  category: string,
  price: number,
  colors: Array<{ name: string; hex: string }>,
  status: Product['status'] = 'published',
): Product {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return {
    id,
    name,
    slug,
    sku: `SKU-${id.toUpperCase()}`,
    description: `${name} — a best-selling piece from our ${category} collection, made with premium materials and built to last.`,
    price,
    compareAtPrice: price > 40 ? Math.round(price * 1.25) : null,
    category,
    status,
    stock: 20 + Number(id.replace(/\D/g, '') || 0) * 3,
    createdAt: '2025-03-01T12:00:00Z',
    updatedAt: '2025-09-10T08:30:00Z',
    colors: colors.map((c, i) => {
      const images = [1, 2].map((n) => ({
        id: `${id}-${c.name}-img${n}`,
        fileId: `fileid-${id}-${c.name}-${n}`,
        url: img(`${id}-${c.name}-${n}`),
        thumbUrl: img(`${id}-${c.name}-${n}`, 200),
        position: n - 1,
        alt: `${name} in ${c.name}`,
      }))
      return {
        id: `${id}-color-${i}`,
        name: c.name,
        hex: c.hex,
        position: i,
        defaultImageId: images[0].fileId,
        images,
      }
    }),
  }
}

export const mockProducts: Product[] = [
  makeProduct('p1', 'Classic T-Shirt', 'Apparel', 28, [
    { name: 'Black', hex: '#1a1a1a' },
    { name: 'White', hex: '#f5f5f5' },
    { name: 'Blue', hex: '#2b5797' },
  ]),
  makeProduct('p2', 'Relaxed Hoodie', 'Apparel', 64, [
    { name: 'Charcoal', hex: '#36454f' },
    { name: 'Sage', hex: '#9caf88' },
  ]),
  makeProduct('p3', 'Canvas Tote', 'Accessories', 22, [{ name: 'Natural', hex: '#e8dcc8' }]),
  makeProduct('p4', 'Wool Beanie', 'Accessories', 18, [
    { name: 'Black', hex: '#1a1a1a' },
    { name: 'Rust', hex: '#b7410e' },
  ], 'draft'),
  makeProduct('p5', 'Everyday Sneaker', 'Footwear', 89, [
    { name: 'White', hex: '#f5f5f5' },
    { name: 'Black', hex: '#1a1a1a' },
  ]),
  makeProduct('p6', 'Linen Shirt', 'Apparel', 54, [{ name: 'Sand', hex: '#c2b280' }], 'archived'),
]

export const mockCategories = ['Apparel', 'Accessories', 'Footwear']

function toListItem(p: Product): ProductListItem {
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    sku: p.sku,
    status: p.status,
    price: p.price,
    compareAtPrice: p.compareAtPrice,
    stock: p.stock,
    category: p.category,
    primaryImageUrl: p.colors[0]?.images[0]?.url ?? null,
    colorCount: p.colors.length,
    updatedAt: p.updatedAt,
  }
}

export const mockProductListItems: ProductListItem[] = mockProducts.map(toListItem)

const customerNames = [
  ['Jordan Lee', 'jordan.lee@example.com'],
  ['Sam Patel', 'sam.patel@example.com'],
  ['Riley Chen', 'riley.chen@example.com'],
  ['Casey Kim', 'casey.kim@example.com'],
  ['Morgan Diaz', 'morgan.diaz@example.com'],
]

export const mockCustomers: CustomerListItem[] = customerNames.map(([name, email], i) => ({
  id: `cust-${i + 1}`,
  fullName: name,
  email,
  phone: `+1 555 010${i}`,
  ordersCount: (i % 4) + 1,
  totalSpent: ((i % 4) + 1) * 76.5,
  createdAt: '2025-02-15T10:00:00Z',
}))

const orderStatuses: Order['status'][] = ['pending', 'processing', 'shipped', 'delivered', 'cancelled']
const paymentStatuses: Order['paymentStatus'][] = ['pending', 'paid', 'refunded', 'failed']

export const mockOrders: Order[] = Array.from({ length: 24 }).map((_, i) => {
  const customer = mockCustomers[i % mockCustomers.length]
  const product = mockProducts[i % mockProducts.length]
  const color = product.colors[0]
  const quantity = (i % 3) + 1
  const unitPrice = product.price
  const subtotal = Number((unitPrice * quantity).toFixed(2))
  const shippingCost = 6.99
  return {
    id: `order-${i + 1}`,
    orderNumber: `ORD-${1000 + i}`,
    status: orderStatuses[i % orderStatuses.length],
    paymentStatus: paymentStatuses[i % paymentStatuses.length],
    customer: {
      id: customer.id,
      fullName: customer.fullName,
      email: customer.email,
      phone: customer.phone,
    },
    items: [
      {
        id: `item-${i + 1}`,
        productId: product.id,
        productName: product.name,
        colorName: color?.name ?? null,
        colorHex: color?.hex ?? null,
        imageUrl: color?.images[0]?.url ?? null,
        sku: product.sku,
        quantity,
        unitPrice,
        subtotal,
      },
    ],
    subtotal,
    shippingCost,
    total: Number((subtotal + shippingCost).toFixed(2)),
    shippingAddress: {
      line1: '123 Market Street',
      line2: null,
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94103',
      country: 'United States',
    },
    createdAt: new Date(Date.now() - i * 36 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - i * 12 * 60 * 60 * 1000).toISOString(),
  }
})

function toOrderListItem(o: Order): OrderListItem {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.fullName,
    customerEmail: o.customer.email,
    status: o.status,
    paymentStatus: o.paymentStatus,
    itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
    total: o.total,
    createdAt: o.createdAt,
  }
}

export const mockOrderListItems: OrderListItem[] = mockOrders.map(toOrderListItem)
