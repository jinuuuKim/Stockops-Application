/**
 * Type definitions for expiry alert API responses.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Alert severity levels.
 * - CRITICAL: Expiry within 1 day
 * - WARNING: Expiry within 7 days
 * - NOTICE: Expiry within 14 days
 * - INFO: Expiry within 30 days
 */
export type AlertLevel = 'CRITICAL' | 'WARNING' | 'NOTICE' | 'INFO'

/**
 * Expiry alert response from /v1/alerts/expiry.
 */
export interface ExpiryAlert {
  id: number
  lotId: number
  lotNumber: string
  productId: number
  productName: string
  productBarcode: string
  daysUntilExpiry: number
  alertLevel: AlertLevel
  expiryDate: string
  quantity: number
  acknowledged: boolean
  createdAt: string
}

/**
 * Expiry alert summary response from /v1/alerts/expiry/summary.
 */
export interface ExpiryAlertSummary {
  total: number
  critical: number
  warning: number
  notice: number
  info: number
}

/**
 * Filter options for expiry alerts query.
 */
export interface ExpiryAlertFilters {
  level?: AlertLevel
  includeAcknowledged?: boolean
}