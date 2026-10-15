import { ORDER_TRANSITIONS } from './order-status.js'
import type { OrderItemRecord, OrderListRecord, OrderRecord } from './orders.types.js'

export const toOrderItem = (item: OrderItemRecord) => ({
  id: item.id,
  productId: item.productId,
  colorId: item.productColorId,
  productName: item.productName,
  sku: item.productSku,
  colorName: item.colorName,
  colorHex: item.colorHex,
  imageUrl: item.imageUrl,
  quantity: item.quantity,
  unitPrice: item.unitPrice,
  subtotal: item.lineTotal,
})

export const toOrderListItem = (order: OrderListRecord) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  customerId: order.customerId,
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  status: order.status,
  paymentStatus: order.paymentStatus,
  itemCount: order.itemCount,
  total: order.total,
  currency: order.currency,
  createdAt: order.createdAt.toISOString(),
})

export const toOrder = (order: OrderRecord) => ({
  id: order.id,
  orderNumber: order.orderNumber,
  status: order.status,
  paymentStatus: order.paymentStatus,
  allowedTransitions: [...ORDER_TRANSITIONS[order.status]],
  currency: order.currency,
  customer: {
    id: order.customerId,
    fullName: order.customerName,
    email: order.customerEmail,
    phone: order.customerPhone,
  },
  shippingAddress: {
    line1: order.shippingLine1,
    line2: order.shippingLine2,
    city: order.shippingCity,
    state: order.shippingState,
    postalCode: order.shippingPostalCode,
    country: order.shippingCountry,
  },
  items: order.items.map(toOrderItem),
  subtotal: order.subtotal,
  shippingCost: order.shippingCost,
  total: order.total,
  history: order.history.map((entry) => ({
    ...entry,
    createdAt: new Date(entry.createdAt).toISOString(),
  })),
  createdAt: order.createdAt.toISOString(),
  updatedAt: order.updatedAt.toISOString(),
})
