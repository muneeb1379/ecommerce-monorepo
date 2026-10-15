import type { FastifyInstance } from 'fastify'
import { jsonSchemaTransform } from 'fastify-type-provider-zod'

/**
 * OpenAPI generated from the Zod route schemas: the machine-readable
 * contract. Human-readable docs live in docs/. Enabled by default outside
 * production (ENABLE_API_DOCS). The plugins are imported lazily so that
 * disabled deployments never load @fastify/swagger-ui (its @fastify/static
 * dependency require()s the ESM-only content-disposition, which crashes on
 * Node runtimes older than 22.12).
 *
 *   UI:   /docs
 *   JSON: /docs/json
 */
export async function registerApiDocs(app: FastifyInstance): Promise<void> {
  const [{ default: swagger }, { default: swaggerUi }] = await Promise.all([
    import('@fastify/swagger'),
    import('@fastify/swagger-ui'),
  ])

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
