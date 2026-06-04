/**
 * Inventory transfer type definitions.
 * Matches backend DTOs for API communication.
 *
 * @author StockOps Team
 * @since 2.0
 */

/**
 * Inventory transfer status enumeration.
 */
export type InventoryTransferStatus = 'REQUESTED' | 'COMPLETED' | 'CANCELLED'

/**
 * Inventory transfer response from API.
 */
export interface InventoryTransfer {
  id: number
  productId: number
  lotId: number | null
  fromLocationId: number
  toLocationId: number
  quantity: number
  status: InventoryTransferStatus
  requestedBy: number
  requestedByName: string | null
  completedBy: number | null
  completedByName: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

/**
 * Create inventory transfer request payload.
 */
export interface CreateInventoryTransferRequest {
  productId: number
  lotId?: number
  fromLocationId: number
  toLocationId: number
  quantity: number
  notes?: string
}
