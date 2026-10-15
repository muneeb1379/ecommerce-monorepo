import { z } from 'zod'

const page = z.number().int().positive().default(1)
const pageSize = z.number().int().positive().max(100).default(20)

export const productListParamsSchema = z.object({
  page,
  pageSize,
  search: z.string().default(''),
  status: z.enum(['all', 'draft', 'published', 'archived']).default('all'),
  categoryId: z.string().default('all'),
  sort: z
    .enum(['updated-desc', 'created-desc', 'name-asc', 'name-desc', 'price-asc', 'price-desc'])
    .default('updated-desc'),
})

export const orderListParamsSchema = z.object({
  page,
  pageSize,
  search: z.string().default(''),
  status: z
    .enum(['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'])
    .default('all'),
  paymentStatus: z.enum(['all', 'pending', 'paid', 'refunded', 'failed']).default('all'),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.enum(['created-desc', 'created-asc', 'total-desc', 'total-asc']).default('created-desc'),
})

export const customerListParamsSchema = z.object({
  page,
  pageSize,
  search: z.string().default(''),
  sort: z.enum(['created-desc', 'name-asc', 'spent-desc', 'orders-desc']).default('created-desc'),
})
