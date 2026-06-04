/**
 * Inbound management type definitions.
 * Matches backend DTOs for API communication.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Inbound status enumeration.
 */
export type InboundStatus = 'DRAFT' | 'CONFIRMED'

/**
 * Inbound header response from API.
 */
export interface Inbound {
  id: number
  inboundDate: string
  supplier: string
  status: InboundStatus
  totalQuantity: number
  createdBy: number
  createdAt: string
  updatedAt: string
}

/**
 * Inbound item response from API.
 */
export interface InboundItem {
  id: number
  inboundId: number
  productId: number
  productName: string
  lotNumber: string
  expiryDate: string | null
  quantity: number
  locationId: number
  locationCode: string
  createdAt: string
}

/**
 * Create inbound request payload.
 */
export interface CreateInboundRequest {
  inboundDate?: string
  supplier: string
}

/**
 * Add inbound item request payload.
 */
export interface AddInboundItemRequest {
  productId: number
  lotNumber: string
  expiryDate?: string
  quantity: number
  locationId: number
}