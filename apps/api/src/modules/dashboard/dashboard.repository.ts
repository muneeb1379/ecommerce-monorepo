import type { Executor } from '../../lib/db.js'

export interface DashboardAggregates {
  totalProducts: number
  publishedProducts: number
  lowStockProducts: number
  totalOrders: number
  pendingOrders: number
  processingOrders: number
  shippedOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  revenueLast30Days: number
  revenuePrevious30Days: number
  totalCustomers: number
}

export const LOW_STOCK_THRESHOLD = 5

/**
 * Every metric is one aggregate query over indexed columns; nothing is
 * computed in application code from raw rows. Metric definitions are
 * documented in docs/features/dashboard/README.md.
 */
export const dashboardRepository = {
  async aggregates(sql: Executor): Promise<DashboardAggregates> {
    const [row] = await sql<DashboardAggregates[]>`
      with product_stats as (
        select count(*) filter (where status <> 'archived')::int as total_products,
               count(*) filter (where status = 'published')::int as published_products,
               count(*) filter (where status = 'published' and stock <= ${LOW_STOCK_THRESHOLD})::int as low_stock_products
        from products
      ),
      order_stats as (
        select count(*)::int as total_orders,
               count(*) filter (where status = 'pending')::int as pending_orders,
               count(*) filter (where status = 'processing')::int as processing_orders,
               count(*) filter (where status = 'shipped')::int as shipped_orders,
               count(*) filter (where status = 'delivered')::int as completed_orders,
               count(*) filter (where status = 'cancelled')::int as cancelled_orders,
               coalesce(sum(total) filter (where payment_status = 'paid' and status <> 'cancelled'), 0)::float8
                 as total_revenue,
               coalesce(sum(total) filter (where payment_status = 'paid' and status <> 'cancelled'
                                             and created_at >= now() - interval '30 days'), 0)::float8
                 as revenue_last30_days,
               coalesce(sum(total) filter (where payment_status = 'paid' and status <> 'cancelled'
                                             and created_at >= now() - interval '60 days'
                                             and created_at < now() - interval '30 days'), 0)::float8
                 as revenue_previous30_days
        from orders
      ),
      customer_stats as (
        select count(*)::int as total_customers from customers
      )
      select * from product_stats, order_stats, customer_stats
    `
    return row!
  },
}

export type DashboardRepository = typeof dashboardRepository
