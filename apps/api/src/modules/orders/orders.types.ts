export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

export const PAYMENT_STATUSES = ['pending', 'paid', 'refunded', 'failed'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const ORDER_SORTS = ['created-desc', 'created-asc', 'total-desc', 'total-asc'] as const
export type OrderSort = (typeof ORDER_SORTS)[number]

export interface OrderListRecord {
  id: string
  orderNumber: string
  customerId: string | null
  customerName: string
  customerEmail: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  itemCount: number
  total: number
  currency: string
  createdAt: Date
}

export interface OrderItemRecord {
  id: string
  productId: string | null
  productColorId: string | null
  productName: string
  productSku: string
  colorName: string | null
  colorHex: string | null
  imageUrl: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
}

export interface OrderHistoryRecord {
  fromStatus: OrderStatus | null
  toStatus: OrderStatus
  changedByName: string | null
  note: string | null
  createdAt: string
}

export interface OrderRecord {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  currency: string
  customerId: string | null
  customerName: string
  customerEmail: string
  customerPhone: string | null
  shippingLine1: string
  shippingLine2: string | null
  shippingCity: string
  shippingState: string
  shippingPostalCode: string
  shippingCountry: string
  subtotal: number
  shippingCost: number
  total: number
  createdAt: Date
  updatedAt: Date
  items: OrderItemRecord[]
  history: OrderHistoryRecord[]
}

export interface OrderListFilters {
  search?: string | undefined
  status?: OrderStatus | undefined
  paymentStatus?: PaymentStatus | undefined
  customerId?: string | undefined
  dateFrom?: Date | undefined
  dateTo?: Date | undefined
  sort: OrderSort
}

export interface CheckoutInput {
  customer: { email: string; fullName: string; phone?: string | null | undefined }
  shippingAddress: {
    line1: string
    line2?: string | null | undefined
    city: string
    state?: string | undefined
    postalCode: string
    country: string
  }
  items: Array<{ productId: string; colorId?: string | undefined; quantity: number }>
}
