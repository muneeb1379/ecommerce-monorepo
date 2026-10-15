import type { Database } from '../../lib/db.js'
import type { OrdersRepository } from '../orders/orders.repository.js'
import type { DashboardRepository } from './dashboard.repository.js'

const RECENT_ORDERS = 5

/** Percentage change, rounded to one decimal. null when there is no baseline. */
export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export class DashboardService {
  constructor(
    private readonly db: Database,
    private readonly repository: DashboardRepository,
    private readonly ordersRepository: OrdersRepository,
  ) {}

  async getSummary() {
    const [aggregates, recent] = await Promise.all([
      this.repository.aggregates(this.db.sql),
      this.ordersRepository.list(this.db.sql, { sort: 'created-desc' }, { page: 1, pageSize: RECENT_ORDERS }),
    ])
    return {
      ...aggregates,
      revenueChangePct: percentChange(aggregates.revenueLast30Days, aggregates.revenuePrevious30Days),
      recentOrders: recent.items,
    }
  }
}
