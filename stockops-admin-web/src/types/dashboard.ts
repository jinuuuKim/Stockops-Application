/**
 * Dashboard-related TypeScript types.
 * Matches backend DTOs for dashboard summary and transactions.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Dashboard summary data from /v1/dashboard/summary.
 * Contains key metrics for the dashboard overview.
 */
export interface DashboardSummary {
  totalProducts: number
  totalInventoryQuantity: number
  todayInboundCount: number
  todayOutboundCount: number
  lowStockCount: number
  pendingCycleCounts: number
  criticalExpiryCount: number
  warningExpiryCount: number
  recentTransactionCount: number
}