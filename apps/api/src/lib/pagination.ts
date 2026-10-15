export interface PageRequest {
  page: number
  pageSize: number
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface Page<T> {
  items: T[]
  total: number
}

export const pageOffset = ({ page, pageSize }: PageRequest): number => (page - 1) * pageSize

export function paginationMeta(request: PageRequest, total: number): PaginationMeta {
  return {
    page: request.page,
    pageSize: request.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / request.pageSize),
  }
}

/** Escapes LIKE/ILIKE wildcards so user search text is matched literally. */
export function likePattern(search: string): string {
  return `%${search.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
}
