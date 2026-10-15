import { z } from 'zod'
import { dataEnvelope } from '../../schemas/common.js'
import { orderListItemSchema } from '../orders/orders.schemas.js'

export const dashboardSchema = z.object({
  currency: z.string(),
  products: z.object({
    total: z.number().int().describe('Products that are not archived'),
    published: z.number().int(),
    lowStock: z.number().int().describe('Published products with stock at or below the low-stock threshold'),
  }),
  orders: z.object({
    total: z.number().int(),
    pending: z.number().int(),
    processing: z.number().int(),
    shipped: z.number().int(),
    completed: z.number().int().describe('Orders with status delivered'),
    cancelled: z.number().int(),
  }),
  revenue: z.object({
    total: z.number().describe('Sum of paid, non-cancelled order totals'),
    last30Days: z.number(),
    previous30Days: z.number(),
    changePct: z.number().nullable().describe('null when the previous period had no revenue'),
  }),
  customers: z.object({ total: z.number().int() }),
  recentOrders: z.array(orderListItemSchema),
})

export const dashboardResponse = dataEnvelope(dashboardSchema)
