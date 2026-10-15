import { z } from 'zod'
import { dataEnvelope, listEnvelope, paginationQuery, searchQuery, uuidParam } from '../../schemas/common.js'
import { ORDER_SORTS, ORDER_STATUSES, PAYMENT_STATUSES } from './orders.types.js'

export const orderStatusSchema = z.enum(ORDER_STATUSES)
export const paymentStatusSchema = z.enum(PAYMENT_STATUSES)

const DAY_MS = 24 * 60 * 60 * 1000

/** Accepts `YYYY-MM-DD` or a full ISO datetime with offset. */
const dateBoundary = (endOfDay: boolean) =>
  z.union([z.iso.date(), z.iso.datetime({ offset: true })]).transform((value) => {
    const date = new Date(value)
    // A date-only `dateTo` includes that whole day.
    return endOfDay && value.length === 10 ? new Date(date.getTime() + DAY_MS) : date
  })

export const orderListQuery = z
  .object({
    ...paginationQuery,
    search: searchQuery.describe('Matches order number, customer email or customer name'),
    status: orderStatusSchema.optional(),
    paymentStatus: paymentStatusSchema.optional(),
    customerId: uuidParam.optional(),
    dateFrom: dateBoundary(false).optional().describe('Inclusive. YYYY-MM-DD or ISO datetime'),
    dateTo: dateBoundary(true)
      .optional()
      .describe('YYYY-MM-DD (inclusive of that day) or ISO datetime (exclusive)'),
    sort: z.enum(ORDER_SORTS).default('created-desc'),
  })
  .refine((q) => !q.dateFrom || !q.dateTo || q.dateFrom < q.dateTo, {
    message: 'dateFrom must be before dateTo',
    path: ['dateFrom'],
  })

export const updateOrderStatusBody = z.object({
  status: orderStatusSchema,
  note: z.string().trim().max(500).optional(),
})

export const checkoutBody = z.object({
  customer: z.object({
    email: z.email().max(254),
    fullName: z.string().trim().min(1).max(200),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[0-9 ()-]{6,20}$/, 'Invalid phone number')
      .nullable()
      .optional(),
  }),
  shippingAddress: z.object({
    line1: z.string().trim().min(1).max(200),
    line2: z.string().trim().max(200).nullable().optional(),
    city: z.string().trim().min(1).max(100),
    state: z.string().trim().max(100).optional(),
    postalCode: z.string().trim().min(1).max(20),
    country: z
      .string()
      .trim()
      .length(2)
      .transform((value) => value.toUpperCase())
      .describe('ISO 3166-1 alpha-2'),
  }),
  items: z
    .array(
      z.object({
        productId: uuidParam,
        colorId: uuidParam.optional(),
        quantity: z.number().int().min(1).max(100),
      }),
    )
    .min(1)
    .max(50),
})

// --- responses ----------------------------------------------------------------

export const orderItemSchema = z.object({
  id: z.string(),
  productId: z.string().nullable(),
  colorId: z.string().nullable(),
  productName: z.string(),
  sku: z.string(),
  colorName: z.string().nullable(),
  colorHex: z.string().nullable(),
  imageUrl: z.string().nullable(),
  quantity: z.number().int(),
  unitPrice: z.number(),
  subtotal: z.number(),
})

export const orderListItemSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  customerId: z.string().nullable(),
  customerName: z.string(),
  customerEmail: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  itemCount: z.number().int(),
  total: z.number(),
  currency: z.string(),
  createdAt: z.string(),
})

export const orderSchema = z.object({
  id: z.string(),
  orderNumber: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  allowedTransitions: z.array(orderStatusSchema),
  currency: z.string(),
  customer: z.object({
    id: z.string().nullable(),
    fullName: z.string(),
    email: z.string(),
    phone: z.string().nullable(),
  }),
  shippingAddress: z.object({
    line1: z.string(),
    line2: z.string().nullable(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string(),
  }),
  items: z.array(orderItemSchema),
  subtotal: z.number(),
  shippingCost: z.number(),
  total: z.number(),
  history: z.array(
    z.object({
      fromStatus: orderStatusSchema.nullable(),
      toStatus: orderStatusSchema,
      changedByName: z.string().nullable(),
      note: z.string().nullable(),
      createdAt: z.string(),
    }),
  ),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const checkoutResultSchema = z.object({
  orderNumber: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  currency: z.string(),
  items: z.array(
    z.object({
      productName: z.string(),
      colorName: z.string().nullable(),
      quantity: z.number().int(),
      unitPrice: z.number(),
      lineTotal: z.number(),
    }),
  ),
  subtotal: z.number(),
  shippingCost: z.number(),
  total: z.number(),
  createdAt: z.string(),
})

export const orderListResponse = listEnvelope(orderListItemSchema)
export const orderResponse = dataEnvelope(orderSchema)
export const orderItemsResponse = dataEnvelope(z.array(orderItemSchema))
export const checkoutResponse = dataEnvelope(checkoutResultSchema)

export type OrderListQuery = z.infer<typeof orderListQuery>
export type UpdateOrderStatusBody = z.infer<typeof updateOrderStatusBody>
export type CheckoutBody = z.infer<typeof checkoutBody>
