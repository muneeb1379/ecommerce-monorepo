import type { FastifyError, FastifyInstance } from 'fastify'
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from 'fastify-type-provider-zod'
import { AppError } from '../lib/errors.js'
import type { ErrorCode } from '../lib/errors.js'

/**
 * Central error handling. Every error leaves the server as:
 *
 *   { "error": { "code": "...", "message": "...", "details"?: ... } }
 *
 * - Request validation failures  → 422 VALIDATION_ERROR with field details
 * - AppError (thrown by services) → its own status/code
 * - Malformed requests            → 400 BAD_REQUEST
 * - Anything else                 → 500 INTERNAL_ERROR. It is logged with the
 *   request id, and no internals (stack, SQL, driver messages) reach the client.
 */
export function registerErrorHandler(app: FastifyInstance, options: { exposeInternalMessages: boolean }): void {
  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      return reply.code(422).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request',
          details: error.validation.map((issue) => ({
            location: error.validationContext ?? 'request',
            path: formatPath(issue.instancePath),
            message: issue.message,
          })),
        },
      })
    }

    if (error instanceof AppError) {
      if (error.statusCode >= 500) request.log.error({ err: error }, error.message)
      return reply.code(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details !== undefined ? { details: error.details } : {}),
        },
      })
    }

    if (isResponseSerializationError(error)) {
      request.log.error({ err: error, issues: error.cause.issues }, 'Response failed schema serialization')
      return sendInternal()
    }

    const fastifyError = error as FastifyError
    const status = fastifyError.statusCode
    if (status && status >= 400 && status < 500) {
      return reply.code(status).send({
        error: { code: clientErrorCode(status), message: clientErrorMessage(status, fastifyError) },
      })
    }

    request.log.error({ err: error }, 'Unhandled error')
    return sendInternal()

    function sendInternal() {
      return reply.code(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          ...(options.exposeInternalMessages ? { details: { message: (error as Error).message } } : {}),
        },
      })
    }
  })

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({
      error: { code: 'NOT_FOUND', message: `Route ${request.method} ${request.url.split('?')[0]} not found` },
    })
  })
}

function formatPath(instancePath: string): string {
  return instancePath.replace(/^\//, '').replace(/\//g, '.')
}

function clientErrorCode(status: number): ErrorCode {
  if (status === 401) return 'UNAUTHENTICATED'
  if (status === 403) return 'FORBIDDEN'
  if (status === 404) return 'NOT_FOUND'
  if (status === 409) return 'CONFLICT'
  if (status === 429) return 'RATE_LIMITED'
  return 'BAD_REQUEST'
}

function clientErrorMessage(status: number, error: FastifyError): string {
  switch (error.code) {
    case 'FST_ERR_CTP_INVALID_MEDIA_TYPE':
      return 'Unsupported content type; send application/json'
    case 'FST_ERR_CTP_BODY_TOO_LARGE':
      return 'Request body is too large'
    case 'FST_ERR_CTP_EMPTY_JSON_BODY':
      return 'Request body must not be empty when Content-Type is application/json'
  }
  if (status === 400 && error instanceof SyntaxError) return 'Malformed JSON body'
  if (status === 429) return 'Too many requests, please try again later'
  return status === 400 ? 'Malformed request' : error.message
}
