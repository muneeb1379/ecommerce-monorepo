import type { Executor, Fragment } from '../../lib/db.js'
import { likePattern, pageOffset } from '../../lib/pagination.js'
import type { Page, PageRequest } from '../../lib/pagination.js'
import type { CustomerListRecord, CustomerRecord, CustomerSort } from './customers.types.js'

/**
 * "Spent" counts paid orders that were not cancelled — the same definition
 * as dashboard revenue (docs/features/dashboard/README.md).
 */
const statsJoin = (sql: Executor) => sql`
  left join lateral (
    select count(*)::int as orders_count,
           coalesce(sum(o.total) filter (where o.payment_status = 'paid' and o.status <> 'cancelled'), 0)::float8 as total_spent,
           max(o.created_at) as last_order_at
    from orders o
    where o.customer_id = c.id
  ) stats on true
`

function orderBy(sql: Executor, sort: CustomerSort): Fragment {
  switch (sort) {
    case 'name-asc':
      return sql`c.full_name asc, c.id`
    case 'spent-desc':
      return sql`stats.total_spent desc, c.id`
    case 'orders-desc':
      return sql`stats.orders_count desc, c.id`
    case 'created-desc':
      return sql`c.created_at desc, c.id`
  }
}

export const customersRepository = {
  async list(
    sql: Executor,
    filters: { search?: string | undefined; sort: CustomerSort },
    page: PageRequest,
  ): Promise<Page<CustomerListRecord>> {
    const where = filters.search
      ? sql`(c.full_name ilike ${likePattern(filters.search)} or c.email ilike ${likePattern(filters.search)} or c.phone ilike ${likePattern(filters.search)})`
      : sql`true`

    const [items, [count]] = await Promise.all([
      sql<CustomerListRecord[]>`
        select c.id, c.full_name, c.email, c.phone, c.created_at,
               stats.orders_count, stats.total_spent, stats.last_order_at
        from customers c
        ${statsJoin(sql)}
        where ${where}
        order by ${orderBy(sql, filters.sort)}
        limit ${page.pageSize} offset ${pageOffset(page)}
      `,
      sql<{ total: number }[]>`select count(*)::int as total from customers c where ${where}`,
    ])
    return { items, total: count?.total ?? 0 }
  },

  async findById(sql: Executor, id: string): Promise<CustomerRecord | null> {
    const [row] = await sql<CustomerRecord[]>`
      select c.id, c.full_name, c.email, c.phone, c.created_at, c.updated_at,
             stats.orders_count, stats.total_spent, stats.last_order_at,
             coalesce((
               select json_agg(json_build_object(
                        'id', a.id, 'line1', a.line1, 'line2', a.line2, 'city', a.city, 'state', a.state,
                        'postalCode', a.postal_code, 'country', a.country, 'isDefault', a.is_default
                      ) order by a.is_default desc, a.created_at desc)
               from addresses a
               where a.customer_id = c.id
             ), '[]'::json) as addresses
      from customers c
      ${statsJoin(sql)}
      where c.id = ${id}
    `
    return row ?? null
  },
}

export type CustomersRepository = typeof customersRepository
