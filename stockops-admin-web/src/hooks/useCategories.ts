/**
 * React Query hooks for category data fetching.
 * Provides hooks for fetching category list, tree structure, and inventory by category.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import { getCategories, getCategoryTree, getInventoryByCategory } from '@/api/categories'
import type { Category, CategoryInventorySummary } from '@/types/category'

/**
 * Fetches all categories as a flat list.
 *
 * @returns React Query result with flat category array
 * @example
 * const { data: categories, isLoading } = useCategories()
 */
export function useCategories(): UseQueryResult<Category[], AxiosError> {
  return useQuery({
    queryKey: ['categories', 'flat'],
    queryFn: async () => {
      const response = await getCategories(true)
      return response
    },
  })
}

/**
 * Fetches category tree structure with nested children.
 *
 * @returns React Query result with category tree array
 * @example
 * const { data: categoryTree } = useCategoryTree()
 */
export function useCategoryTree(): UseQueryResult<Category[], AxiosError> {
  return useQuery({
    queryKey: ['categories', 'tree'],
    queryFn: async () => {
      const response = await getCategoryTree()
      return response
    },
  })
}

/**
 * Fetches inventory summary for a specific category.
 *
 * @param categoryId - Category identifier
 * @returns React Query result with category inventory summary
 * @example
 * const { data: summary } = useInventoryByCategory(1)
 */
export function useInventoryByCategory(
  categoryId: number | null,
): UseQueryResult<CategoryInventorySummary, AxiosError> {
  return useQuery({
    queryKey: ['inventory', 'by-category', categoryId],
    queryFn: async () => {
      if (!categoryId) throw new Error('Category ID is required')
      const response = await getInventoryByCategory(categoryId)
      return response
    },
    enabled: categoryId !== null,
  })
}
