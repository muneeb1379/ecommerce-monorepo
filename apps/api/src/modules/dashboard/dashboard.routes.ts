import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authErrorResponses, errorEnvelope } from '../../schemas/common.js'
import type { DashboardController } from './dashboard.controller.js'
import { dashboardResponse } from './dashboard.schemas.js'

/** Mounted at /api/admin/dashboard */
export function dashboardAdminRoutes(controller: DashboardController): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/',
      {
        onRequest: app.guards.requireAdmin(),
        schema: {
          tags: ['Dashboard (admin)'],
          summary: 'Server-side aggregated dashboard metrics',
          security: [{ bearerAuth: [] }],
          response: { 200: dashboardResponse, ...authErrorResponses, 500: errorEnvelope },
        },
      },
      (_request, reply) => controller.summary(reply),
    )
  }
}
