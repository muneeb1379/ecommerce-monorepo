import compress from '@fastify/compress'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import rateLimit from '@fastify/rate-limit'
import type { FastifyInstance } from 'fastify'
import type { AppConfig } from '../app/config.js'
import { AppError } from '../lib/errors.js'

/**
 * HTTP hardening: secure headers, CORS allow-list, rate limiting, compression.
 * See docs/architecture/api-architecture.md#security.
 */
export async function registerSecurity(app: FastifyInstance, config: AppConfig): Promise<void> {
  await app.register(helmet, {
    // This is a JSON API: lock down CSP completely. Swagger UI (dev only)
    // needs inline assets, so CSP is relaxed only when docs are enabled.
    contentSecurityPolicy: config.apiDocsEnabled
      ? false
      : { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })

  await app.register(cors, {
    // Development without CORS_ORIGIN allows any origin; production requires
    // an explicit allow-list (enforced in config.ts).
    origin: config.cors.origins.length > 0 ? config.cors.origins : !config.isProduction,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Request-Id'],
    exposedHeaders: ['X-Request-Id', 'Location'],
    // Auth uses bearer tokens, not cookies.
    credentials: false,
    maxAge: 600,
  })

  await app.register(rateLimit, {
    global: true,
    max: config.rateLimit.max,
    timeWindow: config.rateLimit.timeWindow,
    // Health checks come from load balancers; don't throttle them.
    allowList: (request) => request.url.startsWith('/health'),
    errorResponseBuilder: (_request, context) =>
      new AppError(429, 'RATE_LIMITED', `Too many requests. Retry in ${Math.ceil(context.ttl / 1000)}s.`),
  })

  await app.register(compress, { global: true, threshold: 1024, encodings: ['br', 'gzip', 'deflate'] })
}
