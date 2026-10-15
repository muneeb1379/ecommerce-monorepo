import type { FastifyReply } from 'fastify'
import { ok, paginated, setNoStore } from '../../utils/http.js'
import type { CustomerListQuery } from './customers.schemas.js'
import type { CustomersService } from './customers.service.js'
import type { CustomerListRecord, CustomerRecord } from './customers.types.js'

const toCustomerListItem = (customer: CustomerListRecord) => ({
  id: customer.id,
  fullName: customer.fullName,
  email: customer.email,
  phone: customer.phone,
  ordersCount: customer.ordersCount,
  totalSpent: customer.totalSpent,
  lastOrderAt: customer.lastOrderAt ? customer.lastOrderAt.toISOString() : null,
  createdAt: customer.createdAt.toISOString(),
})

const toCustomer = (customer: CustomerRecord) => ({
  ...toCustomerListItem(customer),
  updatedAt: customer.updatedAt.toISOString(),
  addresses: customer.addresses,
})

export function createCustomersController(service: CustomersService) {
  return {
    async list(query: CustomerListQuery, reply: FastifyReply) {
      setNoStore(reply)
      const page = { page: query.page, pageSize: query.pageSize }
      const result = await service.list({ search: query.search, sort: query.sort }, page)
      return paginated({ items: result.items.map(toCustomerListItem), total: result.total }, page)
    },

    async get(id: string, reply: FastifyReply) {
      setNoStore(reply)
      return ok(toCustomer(await service.getById(id)))
    },
  }
}

export type CustomersController = ReturnType<typeof createCustomersController>
