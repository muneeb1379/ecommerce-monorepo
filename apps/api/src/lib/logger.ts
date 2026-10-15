import type { FastifyServerOptions } from 'fastify'
import type { AppConfig } from '../app/config.js'

/**
 * Structured (JSON) logging via pino. Pretty-printed in development only.
 * Credentials never reach the logs: auth headers and cookies are redacted.
 */
export function buildLoggerOptions(config: AppConfig): FastifyServerOptions['logger'] {
  if (config.env === 'test') return false

  return {
    level: config.logLevel,
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-key"]'],
      censor: '[redacted]',
    },
    ...(config.isProduction
      ? {}
      : {
          transport: {
            target: 'pino-pretty',
            options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
          },
        }),
  }
}
