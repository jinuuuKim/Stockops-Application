/**
 * React Query hooks for warehouse data fetching.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'

/**
 * Warehouse response from API.
 */
export interface Warehouse {
  id: number
  code: string
  name: string
  address?: string
  phone?: string
  status?: string
  closureReason?: string
  closedAt?: string
}

/**
 * Can-close response from API.
 */
export interface CanCloseResponse {
  canClose: boolean
  reasons: string[]
  remainingInventory: number
  openInbounds: number
  openTransfers: number
}

/**
 * Close warehouse request payload.
 */
export interface CloseWarehouseRequest {
  reason: string
}

/**
 * Fetches all warehouses.
 *
 * @returns React Query result with warehouse array
 * @example
 * const { data: warehouses, isLoading } = useWarehouses()
 */
export function useWarehouses(): UseQueryResult<Warehouse[], AxiosError> {
  return useQuery({
    queryKey: ['warehouses'],
    queryFn: async () => {
      const response = await api.get<Warehouse[]>('/v1/warehouses')
      return response.data
    },
  })
}

/**
 * Fetches warehouses belonging to a specific center.
 *
 * @param centerId - Center identifier
 * @returns React Query result with warehouse array
 * @example
 * const { data: warehouses } = useWarehousesByCenter(1)
 */
export function useWarehousesByCenter(centerId: number | null): UseQueryResult<Warehouse[], AxiosError> {
  return useQuery({
    queryKey: ['warehouses', 'center', centerId],
    queryFn: async () => {
      if (!centerId) throw new Error('Center ID is required')
      const response = await api.get<Warehouse[]>(`/v1/warehouses/center/${centerId}`)
      return response.data
    },
    enabled: centerId !== null,
  })
}

/**
 * Checks whether a warehouse can be closed and retrieves blocking reasons.
 *
 * @param id - Warehouse identifier
 * @returns React Query result with can-close response
 * @example
 * const { data: canCloseData } = useCanCloseWarehouse(1)
 */
export function useCanCloseWarehouse(id: number | null): UseQueryResult<CanCloseResponse, AxiosError> {
  return useQuery({
    queryKey: ['warehouse', id, 'can-close'],
    queryFn: async () => {
      if (!id) throw new Error('Warehouse ID is required')
      const response = await api.get<CanCloseResponse>(`/v1/warehouses/${id}/can-close`)
      return response.data
    },
    enabled: id !== null,
  })
}

/**
 * Closes a warehouse after validating preconditions.
 *
 * @returns Mutation result for closing warehouse
 * @example
 * const closeMutation = useCloseWarehouse()
 * closeMutation.mutate({ id: 1, reason: '사업 종료' })
 */
export function useCloseWarehouse(): UseMutationResult<Warehouse, AxiosError, { id: number; reason: string }> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, reason }: { id: number; reason: string }) => {
      const response = await api.post<Warehouse>(`/v1/warehouses/${id}/close`, { reason })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
    },
  })
}
