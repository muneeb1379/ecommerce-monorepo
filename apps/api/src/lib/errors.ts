/**
 * Application errors. Services throw these; the central error handler
 * (src/plugins/error-handler.ts) turns them into the standard error envelope:
 *
 *   { "error": { "code": "...", "message": "...", "details"?: ... } }
 *
 * Error codes are part of the public API contract — see
 * docs/architecture/api-architecture.md#error-codes before adding one.
 */

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'BUSINESS_RULE_VIOLATION'
  | 'INVALID_STATUS_TRANSITION'
  | 'INSUFFICIENT_STOCK'
  | 'PRODUCT_UNAVAILABLE'
  | 'INVALID_IMAGE'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR'

export class AppError extends Error {
  readonly statusCode: number
  readonly code: ErrorCode
  readonly details: unknown

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, 'BAD_REQUEST', message, details)

export const unauthenticated = (message = 'Authentication required') =>
  new AppError(401, 'UNAUTHENTICATED', message)

export const forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(403, 'FORBIDDEN', message)

export const notFound = (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} not found`)

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, 'CONFLICT', message, details)

export const businessRule = (message: string, details?: unknown) =>
  new AppError(422, 'BUSINESS_RULE_VIOLATION', message, details)

export const upstreamError = (message: string) => new AppError(502, 'UPSTREAM_ERROR', message)

/**
 * Maps Postgres constraint violations to client-safe errors. Anything not
 * recognised is re-thrown untouched and becomes a generic 500.
 */
export function translateDatabaseError(error: unknown, messages: Partial<Record<string, string>> = {}): never {
  if (isPostgresError(error)) {
    const constraint = error.constraint_name ?? ''
    if (error.code === '23505') {
      throw conflict(messages[constraint] ?? 'A record with the same unique value already exists')
    }
    // 23503 foreign_key_violation, 23001 restrict_violation (ON DELETE RESTRICT)
    if (error.code === '23503' || error.code === '23001') {
      throw conflict(messages[constraint] ?? 'The record is referenced by, or references, another record')
    }
    if (error.code === '23514') {
      throw businessRule(messages[constraint] ?? 'The request violates a data constraint')
    }
  }
  throw error
}

interface PostgresErrorLike {
  code: string
  constraint_name?: string
}

export function isPostgresError(error: unknown): error is PostgresErrorLike {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { name?: unknown }).name === 'PostgresError'
  )
}
