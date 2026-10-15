import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import type { FastifyInstance } from 'fastify'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

/**
 * OpenAPI generated from the Zod route schemas: the machine-readable
 * contract. Human-readable docs live in docs/. Enabled by default outside
 * production (ENABLE_API_DOCS).
 *
 *   UI:   /docs
 *   JSON: /docs/json
 */
export async function registerApiDocs(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Ecommerce API',
        version: '0.1.0',
        description:
          'API for the admin dashboard (/api/admin, /api/products, /api/auth) and the public storefront (/api/store). ' +
          'See docs/README.md for feature documentation.',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Supabase Auth access token',
          },
        },
      },
    },
    transform: jsonSchemaTransform,
  })

  await app.register(swaggerUi, { routePrefix: '/docs' })
}
