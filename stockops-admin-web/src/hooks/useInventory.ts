/**
 * React Query hooks for inventory data fetching.
 * Provides hooks for fetching inventory list, single inventory, and transaction history.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useQuery } from '@tanstack/react-query'
import type { UseQueryResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { Inventory, InventoryFilters, InventoryTransaction, TransactionFilters } from '@/types/inventory'

function normalizeArrayResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: T[] }).content
  }

  return []
}

/**
 * Fetches inventory list with optional filters.
 *
 * @param filters - Query filters (productId, locationId, lotId, page, size)
 * @returns React Query result with inventory array
 * @example
 * const { data: inventory, isLoading } = useInventory({ productId: 1 })
 */
export function useInventory(filters?: InventoryFilters): UseQueryResult<Inventory[], AxiosError> {
  return useQuery({
    queryKey: ['inventory', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.productId) params.append('productId', filters.productId.toString())
      if (filters?.locationId) params.append('locationId', filters.locationId.toString())
      if (filters?.lotId) params.append('lotId', filters.lotId.toString())
      if (filters?.page !== undefined) params.append('page', filters.page.toString())
      if (filters?.size) params.append('size', filters.size.toString())

      const response = await api.get<Inventory[]>(`/v1/inventory?${params.toString()}`)
      return normalizeArrayResponse<Inventory>(response.data)
    },
  })
}

/**
 * Fetches single inventory by ID.
 *
 * @param id - Inventory identifier
 * @returns React Query result with single inventory
 * @example
 * const { data: inventory } = useInventoryById(1)
 */
export function useInventoryById(id: number | null): UseQueryResult<Inventory, AxiosError> {
  return useQuery({
    queryKey: ['inventory', id],
    queryFn: async () => {
      if (!id) throw new Error('Inventory ID is required')
      const response = await api.get<Inventory>(`/v1/inventory/${id}`)
      return response.data
    },
    enabled: id !== null,
  })
}

/**
 * Fetches transaction history with optional filters.
 *
 * @param filters - Query filters (productId, locationId, lotId, page, size)
 * @returns React Query result with transaction array
 * @example
 * const { data: transactions } = useTransactionHistory({ productId: 1 })
 */
export function useTransactionHistory(filters?: TransactionFilters): UseQueryResult<InventoryTransaction[], AxiosError> {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters?.productId) params.append('productId', filters.productId.toString())
      if (filters?.locationId) params.append('locationId', filters.locationId.toString())
      if (filters?.lotId) params.append('lotId', filters.lotId.toString())
      if (filters?.page !== undefined) params.append('page', filters.page.toString())
      if (filters?.size) params.append('size', filters.size.toString())

      const response = await api.get<InventoryTransaction[]>(`/v1/inventory/transactions?${params.toString()}`)
      return normalizeArrayResponse<InventoryTransaction>(response.data)
    },
  })
}

/**
 * Fetches recent transactions (last 50).
 *
 * @returns React Query result with recent transaction array
 * @example
 * const { data: recentTransactions } = useRecentTransactions()
 */
export function useRecentTransactions(): UseQueryResult<InventoryTransaction[], AxiosError> {
  return useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: async () => {
      const response = await api.get<InventoryTransaction[]>('/v1/inventory/transactions/recent')
      return normalizeArrayResponse<InventoryTransaction>(response.data)
    },
  })
}
