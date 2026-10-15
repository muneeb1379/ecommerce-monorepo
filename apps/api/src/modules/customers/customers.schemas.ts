import { z } from 'zod'
import { dataEnvelope, listEnvelope, paginationQuery, searchQuery } from '../../schemas/common.js'
import { CUSTOMER_SORTS } from './customers.types.js'

export const customerListQuery = z.object({
  ...paginationQuery,
  search: searchQuery.describe('Matches name, email or phone'),
  sort: z.enum(CUSTOMER_SORTS).default('created-desc'),
})

export const customerListItemSchema = z.object({
  id: z.string(),
  fullName: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  ordersCount: z.number().int(),
  totalSpent: z.number(),
  lastOrderAt: z.string().nullable(),
  createdAt: z.string(),
})

export const customerSchema = customerListItemSchema.extend({
  updatedAt: z.string(),
  addresses: z.array(
    z.object({
      id: z.string(),
      line1: z.string(),
      line2: z.string().nullable(),
      city: z.string(),
      state: z.string(),
      postalCode: z.string(),
      country: z.string(),
      isDefault: z.boolean(),
    }),
  ),
})

export const customerListResponse = listEnvelope(customerListItemSchema)
export const customerResponse = dataEnvelope(customerSchema)

export type CustomerListQuery = z.infer<typeof customerListQuery>
