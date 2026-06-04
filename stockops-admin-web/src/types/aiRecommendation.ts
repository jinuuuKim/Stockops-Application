/**
 * AI recommendation TypeScript types.
 * Matches backend AIRecommendationDTO and AIRecommendationStatus enum.
 *
 * @author StockOps Team
 * @since 2.0
 */

/**
 * AI recommendation lifecycle states.
 * Matches backend AIRecommendationStatus enum.
 */
export type AIRecommendationStatus =
  | 'READY_FOR_APPROVAL'
  | 'NO_ACTION'
  | 'INSUFFICIENT_HISTORY'
  | 'APPROVED_TO_DRAFT'

/**
 * AI reorder recommendation response payload.
 * Matches backend AIRecommendationDTO record.
 */
export interface AIRecommendation {
  /** Recommendation identifier */
  id: number
  /** Business date of the recommendation snapshot */
  businessDate: string
  /** Product identifier */
  productId: number
  /** Product display name */
  productName: string | null
  /** Product barcode */
  productBarcode: string | null
  /** Center identifier */
  centerId: number
  /** Warehouse identifier */
  warehouseId: number
  /** Recommendation lifecycle state */
  status: AIRecommendationStatus
  /** Latest available stock used by the snapshot */
  currentStockQuantity: number
  /** Product safety stock threshold */
  safetyStockQuantity: number
  /** Recommended reorder quantity */
  recommendedQuantity: number
  /** Forecasted demand for the next seven days */
  sevenDayForecastQuantity: number
  /** Expected lead time in days */
  leadTimeDays: number
  /** Forecasted demand during lead time */
  leadTimeDemandQuantity: number
  /** Trailing seven-day average demand */
  trailingSevenDayAverage: number
  /** Same-weekday lookback average demand */
  sameWeekdayAverage: number
  /** Weighted daily demand estimate */
  weightedDailyDemand: number
  /** Confirmed outbound event count used by the forecast */
  demandEventCount: number
  /** Whether the product lacked confirmed outbound history */
  insufficientHistory: boolean
  /** Deterministic explanation string */
  explanationSummary: string | null
  /** Linked draft purchase-order id after approval */
  approvedPurchaseOrderId: number | null
  /** Linked draft purchase-order number after approval */
  approvedPurchaseOrderNumber: string | null
  /** Approval timestamp */
  approvedAt: string | null
  /** Approving user id */
  approvedByUserId: number | null
  /** Forecast model identifier that produced this recommendation */
  modelVersion: string
  /** Creation timestamp */
  createdAt: string
  /** Last update timestamp */
  updatedAt: string
}

/**
 * Query filter parameters for AI recommendations.
 */
export interface AIRecommendationFilter {
  /** Optional business date filter (ISO date string) */
  businessDate?: string
  /** Optional center scope filter */
  centerId?: number
  /** Optional warehouse scope filter */
  warehouseId?: number
  /** Optional product filter */
  productId?: number
  /** Optional forecast model selector (default: "statistical") */
  model?: string
}