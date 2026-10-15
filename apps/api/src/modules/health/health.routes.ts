import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { Database } from '../../lib/db.js'
import { dataEnvelope, errorEnvelope } from '../../schemas/common.js'

const statusResponse = dataEnvelope(z.object({ status: z.enum(['ok']) }))

/** Mounted at /health. Liveness and readiness probes for load balancers. */
export function healthRoutes(db: Database): FastifyPluginAsyncZod {
  return async (app) => {
    app.get(
      '/',
      { schema: { tags: ['Health'], summary: 'Liveness probe', response: { 200: statusResponse } } },
      async () => ({ data: { status: 'ok' as const } }),
    )

    app.get(
      '/ready',
      {
        schema: {
          tags: ['Health'],
          summary: 'Readiness probe (checks the database connection)',
          response: { 200: statusResponse, 503: errorEnvelope },
        },
      },
      async (request, reply) => {
        try {
          await db.ping()
          return { data: { status: 'ok' as const } }
        } catch (error) {
          request.log.error({ err: error }, 'Readiness check failed')
          return reply.code(503).send({ error: { code: 'INTERNAL_ERROR', message: 'Database unavailable' } })
        }
      },
    )
  }
}
