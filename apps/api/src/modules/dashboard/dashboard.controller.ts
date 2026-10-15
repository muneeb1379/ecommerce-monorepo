import type { FastifyReply } from 'fastify'
import { ok, setNoStore } from '../../utils/http.js'
import { toOrderListItem } from '../orders/orders.mapper.js'
import type { DashboardService } from './dashboard.service.js'

export function createDashboardController(service: DashboardService, options: { currency: string }) {
  return {
    async summary(reply: FastifyReply) {
      setNoStore(reply)
      const summary = await service.getSummary()
      return ok({
        currency: options.currency,
        products: {
          total: summary.totalProducts,
          published: summary.publishedProducts,
          lowStock: summary.lowStockProducts,
        },
        orders: {
          total: summary.totalOrders,
          pending: summary.pendingOrders,
          processing: summary.processingOrders,
          shipped: summary.shippedOrders,
          completed: summary.completedOrders,
          cancelled: summary.cancelledOrders,
        },
        revenue: {
          total: summary.totalRevenue,
          last30Days: summary.revenueLast30Days,
          previous30Days: summary.revenuePrevious30Days,
          changePct: summary.revenueChangePct,
        },
        customers: { total: summary.totalCustomers },
        recentOrders: summary.recentOrders.map(toOrderListItem),
      })
    },
  }
}

export type DashboardController = ReturnType<typeof createDashboardController>
