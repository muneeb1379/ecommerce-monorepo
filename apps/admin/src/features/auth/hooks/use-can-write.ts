import { useAuth } from '@/features/auth/hooks/use-auth'
import { hasRole } from '@/lib/permissions'

/**
 * Catalog writes (products, colors, images, categories, uploads) need the
 * `admin` role or higher. `staff` can read everything and update orders.
 */
export function useCanWriteCatalog(): boolean {
  const { profile } = useAuth()
  return hasRole(profile?.role, 'admin')
}
