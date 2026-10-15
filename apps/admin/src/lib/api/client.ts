import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

/** One entry of `error.details` on a 422 VALIDATION_ERROR response. */
export interface ValidationIssue {
  location: 'body' | 'querystring' | 'params'
  path: string
  message: string
}

function isValidationIssues(value: unknown): value is ValidationIssue[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item !== null &&
        typeof item === 'object' &&
        typeof (item as ValidationIssue).path === 'string' &&
        typeof (item as ValidationIssue).message === 'string',
    )
  )
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string | undefined
  readonly details: unknown

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isUnauthorized() {
    return this.status === 401
  }

  get isForbidden() {
    return this.status === 403
  }

  get isNotFound() {
    return this.status === 404
  }

  get isValidation() {
    return this.status === 422
  }

  get isConflict() {
    return this.status === 409
  }

  /** Request-body validation problems keyed by field path (dot notation). */
  get fieldErrors(): Record<string, string> {
    const errors: Record<string, string> = {}
    if (this.code === 'VALIDATION_ERROR' && isValidationIssues(this.details)) {
      for (const issue of this.details) {
        if (issue.location === 'body' && issue.path && !(issue.path in errors)) {
          errors[issue.path] = issue.message
        }
      }
    }
    return errors
  }
}

/**
 * Fired whenever a request comes back 401. The app wires a single
 * listener (in AuthProvider) that clears the Supabase session and
 * redirects to /login — kept out of this module so the API client
 * doesn't need to know about React Router.
 */
type UnauthorizedListener = () => void
let unauthorizedListener: UnauthorizedListener | null = null

export function onUnauthorized(listener: UnauthorizedListener) {
  unauthorizedListener = listener
  return () => {
    unauthorizedListener = null
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const url = new URL(path.replace(/^\//, ''), env.apiBaseUrl.replace(/\/?$/, '/'))
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }
  return url.toString()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * The API wraps responses as `{ data }` (single resource) or
 * `{ data, pagination }` (collection). Unwrap both so callers get the inner
 * value, and collections come back as `{ items, pagination }`.
 */
function unwrap(payload: unknown): unknown {
  if (!isRecord(payload) || !('data' in payload)) return payload
  if ('pagination' in payload) {
    return { items: payload.data, pagination: payload.pagination }
  }
  return payload.data
}

function toApiError(response: Response, payload: unknown): ApiError {
  const error = isRecord(payload) && isRecord(payload.error) ? payload.error : undefined
  const message =
    error && typeof error.message === 'string' ? error.message : response.statusText || 'Request failed'
  const code = error && typeof error.code === 'string' ? error.code : undefined
  return new ApiError(response.status, message, code, error?.details)
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options

  const {
    data: { session },
  } = await supabase.auth.getSession()

  let response: Response
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers: {
        // Only send a content type when there is a body: the API rejects an
        // empty body that claims to be JSON.
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, 'Network error — check your connection and try again.')
  }

  if (response.status === 204) {
    return undefined as T
  }

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    if (response.status === 401) {
      unauthorizedListener?.()
    }
    throw toApiError(response, payload)
  }

  return unwrap(payload) as T
}

export const apiClient = {
  get: <T>(path: string, query?: RequestOptions['query'], signal?: AbortSignal) =>
    request<T>(path, { method: 'GET', query, signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'POST', body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PATCH', body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: 'PUT', body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: 'DELETE', signal }),
}
