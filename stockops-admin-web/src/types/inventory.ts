/**
 * TypeScript type definitions for Inventory and Transaction DTOs.
 * Matches backend Java record structures.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Inventory availability state.
 */
export type InventoryStatus = 'ACTIVE' | 'RESERVED' | 'QUARANTINE' | 'EXPIRED'

/**
 * Inventory response payload with denormalized product, location, and lot details.
 */
export interface Inventory {
  /** Inventory identifier */
  id: number
  /** Product identifier */
  productId: number
  /** Product barcode */
  productBarcode: string
  /** Product name */
  productName: string
  /** Location identifier */
  locationId: number
  /** Location code */
  locationCode: string
  /** Location name */
  locationName: string
  /** Lot identifier */
  lotId: number
  /** Lot number */
  lotNumber: string
  /** Lot expiry date (ISO date string) */
  expiryDate: string
  /** Available quantity */
  quantity: number
  /** Reserved quantity */
  reservedQuantity: number
  /** Inventory status */
  status: InventoryStatus
  /** Creation timestamp (ISO datetime string) */
  createdAt: string
  /** Last update timestamp (ISO datetime string) */
  updatedAt: string
}

/**
 * Inventory transaction response payload.
 */
export interface InventoryTransaction {
  /** Transaction identifier */
  id: number
  /** Transaction type */
  type: string
  /** Product identifier */
  productId: number
  /** Product name */
  productName: string
  /** Location identifier */
  locationId: number
  /** Location code */
  locationCode: string
  /** Lot identifier */
  lotId: number
  /** Lot number */
  lotNumber: string
  /** Transaction quantity */
  quantity: number
  /** Quantity before transaction */
  beforeQuantity: number
  /** Quantity after transaction */
  afterQuantity: number
  /** Reference identifier */
  referenceId: number
  /** Reference type */
  referenceType: string
  /** Operator identifier */
  createdBy: number
  /** Creation timestamp (ISO datetime string) */
  createdAt: string
}

/**
 * Inventory query filters.
 */
export interface InventoryFilters {
  /** Filter by product ID */
  productId?: number
  /** Filter by location ID */
  locationId?: number
  /** Filter by lot ID */
  lotId?: number
  /** Page number (0-indexed) */
  page?: number
  /** Page size */
  size?: number
}

/**
 * Transaction history query filters.
 */
export interface TransactionFilters {
  /** Filter by product ID */
  productId?: number
  /** Filter by location ID */
  locationId?: number
  /** Filter by lot ID */
  lotId?: number
  /** Page number (0-indexed) */
  page?: number
  /** Page size */
  size?: number
}