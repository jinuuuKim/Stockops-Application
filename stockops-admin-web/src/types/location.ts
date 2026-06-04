/**
 * Location master types for StockOps frontend.
 * Matches backend DTOs for API communication.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Location response from API.
 */
export type LocationType = 'STORAGE' | 'RECEIVING' | 'SHIPPING' | 'QUARANTINE'

export interface Location {
  id: number
  warehouseId?: number
  code: string
  name: string
  type: LocationType | string
  zone: string | null
  shelf: string | null
  level: string | null
  createdAt: string
  updatedAt: string
}

export interface LocationRequest {
  warehouseId: number
  code: string
  name: string
  type: LocationType
  zone?: string | null
  shelf?: string | null
  level?: string | null
}
