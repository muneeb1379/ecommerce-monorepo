import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authErrorResponses, errorEnvelope } from '../../schemas/common.js'
import { createUploadsController } from './uploads.controller.js'
import { imageKitAuthResponse } from './uploads.schemas.js'
import type { UploadsService } from './uploads.service.js'

/** Mounted at /api/admin/uploads */
export function uploadsAdminRoutes(service: UploadsService): FastifyPluginAsyncZod {
  const controller = createUploadsController(service)

  return async (app) => {
    app.get(
      '/imagekit-auth',
      {
        onRequest: app.guards.requireAdmin('admin'),
        schema: {
          tags: ['Uploads'],
          summary: 'Signed credentials for a direct browser upload to ImageKit',
          security: [{ bearerAuth: [] }],
          response: { 200: imageKitAuthResponse, ...authErrorResponses, 500: errorEnvelope },
        },
      },
      controller.imageKitAuth,
    )
  }
}
