import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authErrorResponses, commonErrorResponses, errorEnvelope, idParams } from '../../schemas/common.js'
import type { CustomersController } from './customers.controller.js'
import { customerListQuery, customerListResponse, customerResponse } from './customers.schemas.js'

const security = [{ bearerAuth: [] }]
const adminErrors = { ...commonErrorResponses, ...authErrorResponses, 404: errorEnvelope }

/**
 * Mounted at /api/admin/customers. Customer data is private: there is no
 * storefront customer endpoint. Use GET /api/admin/orders?customerId= for a
 * customer's order history.
 */
export function customersAdminRoutes(controller: CustomersController): FastifyPluginAsyncZod {
  return async (app) => {
    const tags = ['Customers (admin)']
    const onRequest = app.guards.requireAdmin()

    app.get(
      '/',
      {
        onRequest,
        schema: {
          tags,
          summary: 'List customers with order count and total spent',
          security,
          querystring: customerListQuery,
          response: { 200: customerListResponse, ...adminErrors },
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
          summary: 'Customer details with saved addresses',
          security,
          params: idParams,
          response: { 200: customerResponse, ...adminErrors },
        },
      },
      (request, reply) => controller.get(request.params.id, reply),
    )
  }
}
