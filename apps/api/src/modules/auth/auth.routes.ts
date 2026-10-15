import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { authErrorResponses } from '../../schemas/common.js'
import { authController } from './auth.controller.js'
import { meResponse } from './auth.schemas.js'

/** Mounted at /api/auth */
export const authRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get(
    '/me',
    {
      onRequest: app.guards.requireAdmin(),
      schema: {
        tags: ['Auth'],
        summary: 'Current admin profile and role',
        security: [{ bearerAuth: [] }],
        response: { 200: meResponse, ...authErrorResponses },
      },
    },
    authController.me,
  )
}
