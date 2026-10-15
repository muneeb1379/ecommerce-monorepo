import type { FastifyReply } from 'fastify'
import { paginationMeta } from '../lib/pagination.js'
import type { Page, PageRequest, PaginationMeta } from '../lib/pagination.js'

/** `{ data }` — the success envelope for single resources. */
export const ok = <T>(data: T): { data: T } => ({ data })

/** `{ data, pagination }` — the success envelope for collections. */
export const paginated = <T>(page: Page<T>, request: PageRequest): { data: T[]; pagination: PaginationMeta } => ({
  data: page.items,
  pagination: paginationMeta(request, page.total),
})

/**
 * Public, CDN-cacheable response. Used only on storefront endpoints that
 * never vary by user. Admin responses are always `no-store`.
 */
export function setPublicCache(reply: FastifyReply, maxAgeSeconds: number): void {
  if (maxAgeSeconds === 0) {
    reply.header('Cache-Control', 'no-cache')
    return
  }
  reply.header(
    'Cache-Control',
    `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 5}`,
  )
}

export function setNoStore(reply: FastifyReply): void {
  reply.header('Cache-Control', 'no-store')
}
