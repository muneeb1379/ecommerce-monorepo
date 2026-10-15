import type { FastifyReply } from 'fastify'
import { ok, paginated, setNoStore } from '../../utils/http.js'
import { toOrder, toOrderItem, toOrderListItem } from './orders.mapper.js'
import type { CheckoutBody, OrderListQuery, UpdateOrderStatusBody } from './orders.schemas.js'
import type { OrdersService } from './orders.service.js'

export function createOrdersController(service: OrdersService) {
  return {
    async list(query: OrderListQuery, reply: FastifyReply) {
      setNoStore(reply)
      const page = { page: query.page, pageSize: query.pageSize }
      const result = await service.list(
        {
          search: query.search,
          status: query.status,
          paymentStatus: query.paymentStatus,
          customerId: query.customerId,
          dateFrom: query.dateFrom,
          dateTo: query.dateTo,
          sort: query.sort,
        },
        page,
      )
      return paginated({ items: result.items.map(toOrderListItem), total: result.total }, page)
    },

    async get(id: string, reply: FastifyReply) {
      setNoStore(reply)
      return ok(toOrder(await service.getById(id)))
    },

    async items(id: string, reply: FastifyReply) {
      setNoStore(reply)
      return ok((await service.getItems(id)).map(toOrderItem))
    },

    async updateStatus(id: string, body: UpdateOrderStatusBody, adminId: string) {
      return ok(toOrder(await service.updateStatus(id, body, adminId)))
    },

    async checkout(body: CheckoutBody, reply: FastifyReply) {
      setNoStore(reply)
      const result = await service.checkout(body)
      reply.code(201)
      return ok(result)
    },
  }
}

export type OrdersController = ReturnType<typeof createOrdersController>
