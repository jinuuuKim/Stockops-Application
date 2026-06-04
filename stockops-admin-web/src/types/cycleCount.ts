/**
 * Cycle count (재고 실사) type definitions.
 * Matches backend DTOs for API communication.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Cycle count status enumeration.
 */
export type CycleCountStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

/**
 * Cycle count response from API.
 */
export interface CycleCount {
  id: number
  countDate: string
  status: CycleCountStatus
  locationId: number
  createdBy: number
  completedBy: number | null
  createdAt: string
  completedAt: string | null
  items: CycleCountItem[]
}

/**
 * Cycle count item response from API.
 */
export interface CycleCountItem {
  id: number
  cycleCountId: number
  inventoryId: number
  expectedQuantity: number
  actualQuantity: number | null
  variance: number | null
  countedBy: number | null
  countedAt: string | null
  notes: string | null
}

/**
 * Create cycle count request payload.
 */
export interface CreateCycleCountRequest {
  countDate: string
  locationId: number
  inventoryIds: number[]
}

/**
 * Complete cycle count request payload.
 */
export interface CompleteCycleCountRequest {
  items: {
    itemId: number
    actualQuantity: number
    notes?: string
  }[]
}
