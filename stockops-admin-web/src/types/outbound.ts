/**
 * Outbound management types for StockOps frontend.
 * Matches backend DTOs for API communication.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Outbound status enumeration.
 */
export type OutboundStatus = 'DRAFT' | 'CONFIRMED'

/**
 * Outbound header response from API.
 */
export interface OutboundDTO {
  id: number
  outboundDate: string
  customer: string
  status: OutboundStatus
  totalQuantity: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

/**
 * Outbound item response from API.
 * Confirmed outbounds may have multiple items for one product when FEFO splits quantity across lots.
 */
export interface OutboundItemDTO {
  id: number
  outboundId: number
  productId: number
  productName: string
  lotId: number | null
  lotNumber: string | null
  quantity: number
  createdAt: string
}

/**
 * Request payload for creating a new outbound.
 */
export interface CreateOutboundRequest {
  outboundDate?: string
  customer: string
}

/**
 * Request payload for adding an item to an outbound.
 */
export interface AddOutboundItemRequest {
  productId: number
  quantity: number
}