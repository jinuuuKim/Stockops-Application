/**
 * API client functions for category management.
 * Provides fetching operations for category hierarchy.
 *
 * @author StockOps Team
 * @since 1.0
 */

import api from '@/lib/api'
import type { Category, CategoryInventorySummary } from '@/types/category'

/**
 * Fetches categories with optional filters.
 *
 * @param flat - Return flat list instead of tree
 * @param rootOnly - Return only root (level 1) categories
 * @returns Array of categories
 */
export async function getCategories(flat = false, rootOnly = false): Promise<Category[]> {
  const response = await api.get<Category[]>('/v1/categories', {
    params: { flat, rootOnly },
  })
  return response.data
}

/**
 * Fetches category tree structure.
 *
 * @returns Array of root categories with nested children
 */
export async function getCategoryTree(): Promise<Category[]> {
  const response = await api.get<Category[]>('/v1/categories')
  return response.data
}

/**
 * Fetches inventory summary aggregated by category.
 *
 * @param categoryId - Category identifier to filter by
 * @returns Array of inventory items or summary for the category
 */
export async function getInventoryByCategory(categoryId: number): Promise<CategoryInventorySummary> {
  const response = await api.get<CategoryInventorySummary>('/v1/inventory/by-category', {
    params: { categoryId },
  })
  return response.data
}
