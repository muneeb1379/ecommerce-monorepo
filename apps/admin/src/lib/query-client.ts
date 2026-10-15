import { MutationCache, QueryClient } from '@tanstack/react-query'
import { notifications } from '@mantine/notifications'
import { ApiError } from '@/lib/api/client'

/** A human-readable message for a failed API call, including validation details. */
export function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.isValidation) {
      const fields = Object.entries(error.fieldErrors)
      if (fields.length > 0) {
        return fields.map(([path, message]) => `${path}: ${message}`).join('\n')
      }
    }
    return error.message
  }
  return error instanceof Error ? error.message : 'An unexpected error occurred.'
}

export const queryClient = new QueryClient({
  // Every failed mutation surfaces the API's own message (e.g. "Cannot change
  // order status from delivered to pending", "This category still has
  // products"), so individual hooks only need to handle success.
  mutationCache: new MutationCache({
    onError: (error) => {
      // 401 is handled by the auth provider (sign out + redirect to /login).
      if (error instanceof ApiError && error.isUnauthorized) return
      notifications.show({
        color: 'red',
        title: error instanceof ApiError && error.isForbidden ? 'Not allowed' : 'Request failed',
        message: describeError(error),
        style: { whiteSpace: 'pre-line' },
      })
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false
        }
        return failureCount < 2
      },
    },
    mutations: {
      retry: false,
    },
  },
})

export const queryKeys = {
  dashboard: {
    metrics: ['dashboard', 'metrics'] as const,
  },
  products: {
    all: ['products'] as const,
    list: (params: unknown) => ['products', 'list', params] as const,
    detail: (id: string) => ['products', 'detail', id] as const,
  },
  categories: {
    all: ['categories'] as const,
    list: (params: unknown) => ['categories', 'list', params] as const,
    detail: (id: string) => ['categories', 'detail', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (params: unknown) => ['orders', 'list', params] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
  },
  customers: {
    all: ['customers'] as const,
    list: (params: unknown) => ['customers', 'list', params] as const,
    detail: (id: string) => ['customers', 'detail', id] as const,
  },
  auth: {
    profile: ['auth', 'profile'] as const,
  },
}
