/**
 * Category types for StockOps frontend.
 * Matches backend CategoryDTO for API communication.
 *
 * @author StockOps Team
 * @since 1.0
 */

/**
 * Category response from API with nested children for tree representation.
 */
export interface Category {
  /** Category identifier */
  id: number
  /** Category name */
  name: string
  /** Unique category code */
  code: string
  /** Category level (1=대분류, 2=중분류, 3=소분류) */
  level: number
  /** Display sort order */
  sortOrder: number
  /** Whether the category is active */
  active: boolean
  /** Parent category ID (null for root categories) */
  parentId: number | null
  /** Child categories */
  children: Category[]
  /** Creation timestamp (ISO datetime string) */
  createdAt: string
  /** Last update timestamp (ISO datetime string) */
  updatedAt: string
}

/**
 * Category inventory aggregation response.
 * Returned by /v1/inventory/by-category endpoint.
 */
export interface CategoryInventorySummary {
  /** Category identifier */
  categoryId: number
  /** Category name */
  categoryName: string
  /** Total inventory quantity across all products in this category */
  totalQuantity: number
  /** Total inventory value (quantity * default price) */
  totalValue: number
  /** Number of distinct products in this category with inventory */
  productCount: number
}
