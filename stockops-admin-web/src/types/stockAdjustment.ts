/**
 * TypeScript type definitions for Stock Adjustment DTOs.
 * Matches backend Java record structures.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Stock adjustment status enumeration.
 */
export type AdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

/**
 * Stock adjustment response payload.
 */
export interface StockAdjustment {
  /** Adjustment identifier */
  id: number
  /** Inventory identifier */
  inventoryId: number
  /** Inventory info summary (product + location + lot) */
  inventoryInfo: string
  /** Quantity before adjustment */
  beforeQuantity: number
  /** Quantity after adjustment */
  afterQuantity: number
  /** Difference (after - before) */
  difference: number
  /** Reason code identifier */
  reasonCodeId: number
  /** Reason code display name */
  reasonCodeName: string
  /** Adjustment note */
  note: string
  /** Adjustment status */
  status: AdjustmentStatus
  /** Creator user identifier */
  createdBy: number
  /** Creator user name */
  createdByName: string
  /** Approver user identifier */
  approvedBy: number | null
  /** Approver user name */
  approvedByName: string | null
  /** Creation timestamp (ISO datetime string) */
  createdAt: string
  /** Last update timestamp (ISO datetime string) */
  updatedAt: string
}

/**
 * Stock adjustment approval request payload.
 */
export interface ApproveAdjustmentRequest {
  /** Adjustment identifier */
  adjustmentId: number
  /** true to approve, false to reject */
  approved: boolean
}
