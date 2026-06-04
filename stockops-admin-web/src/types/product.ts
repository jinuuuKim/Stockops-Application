/**
 * Product master types for StockOps frontend.
 * Matches backend DTOs for API communication.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Product response from API.
 */
export interface ProductDTO {
  id: number
  barcode: string
  name: string
  description: string
  /** Category name (legacy string field) */
  category: string
  /** Category ID from category master (optional, for new category system) */
  categoryId?: number
  unit: string
  expiryManaged: boolean
  defaultPrice: number
  safetyStockQuantity: number
  createdAt: string
  updatedAt: string
}

/**
 * Request payload for creating a new product.
 */
export interface CreateProductRequest {
  barcode: string
  name: string
  description?: string
  category?: string
  categoryId?: number
  unit: string
  expiryManaged: boolean
  defaultPrice?: number
  safetyStockQuantity?: number
}

/**
 * Request payload for updating an existing product.
 */
export interface UpdateProductRequest {
  name?: string
  description?: string
  category?: string
  categoryId?: number
  unit?: string
  expiryManaged?: boolean
  defaultPrice?: number
  safetyStockQuantity?: number
}