import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authErrorResponses, commonErrorResponses, errorEnvelope, idParams } from '../../schemas/common.js'
import type { OrdersController } from './orders.controller.js'
import {
  checkoutBody,
  checkoutResponse,
  orderItemsResponse,
  orderListQuery,
  orderListResponse,
  orderResponse,
  updateOrderStatusBody,
} from './orders.schemas.js'

const security = [{ bearerAuth: [] }]
const adminErrors = { ...commonErrorResponses, ...authErrorResponses, 404: errorEnvelope }

/** Mounted at /api/admin/orders. Any admin role (staff runs fulfilment). */
export function ordersAdminRoutes(controller: OrdersController): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Orders (admin)']
    const onRequest = app.guards.requireAdmin()

    app.get(
      '/',
      {
        onRequest,
        schema: {
          tags,
          summary: 'List orders',
          security,
          querystring: orderListQuery,
          response: { 200: orderListResponse, ...adminErrors },
        },
      },
      (request, reply) => controller.list(request.query, reply),
    )

    app.get(
      '/:id',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Order details with customer, address, items and status history',
          security,
          params: idParams,
          response: { 200: orderResponse, ...adminErrors },
        },
      },
      (request, reply) => controller.get(request.params.id, reply),
    )

    app.get(
      '/:id/items',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Order line items (purchase-time snapshots)',
          security,
          params: idParams,
          response: { 200: orderItemsResponse, ...adminErrors },
        },
      },
      (request, reply) => controller.items(request.params.id, reply),
    )

    app.patch(
      '/:id/status',
      {
        onRequest,
        schema: {
          tags,
          summary: 'Change order status (validated against the order lifecycle)',
          security,
          params: idParams,
          body: updateOrderStatusBody,
          response: { 200: orderResponse, ...adminErrors },
        },
      },
      (request) => controller.updateStatus(request.params.id, request.body, request.admin!.id),
    )
  }
}

/** Mounted at /api/store/orders. Public guest checkout, strictly rate limited. */
export function ordersStoreRoutes(controller: OrdersController, options: { rateLimitMax: number }): FastifyPluginAsyncZod {
  return async (app) => {
    app.post(
      '/',
      {
        config: { rateLimit: { max: options.rateLimitMax, timeWindow: '1 minute' } },
        schema: {
          tags: ['Storefront'],
          summary: 'Place an order. Prices, stock and totals are computed by the server.',
          body: checkoutBody,
          response: { 201: checkoutResponse, ...commonErrorResponses, 429: errorEnvelope },
        },
      },
      (request, reply) => controller.checkout(request.body, reply),
    )
  }
}
