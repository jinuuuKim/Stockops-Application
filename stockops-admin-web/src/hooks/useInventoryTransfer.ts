/**
 * React Query hooks for inventory transfer management.
 * Provides hooks for fetching, creating, completing, and cancelling transfers.
 *
 * @author StockOps Team
 * @since 2.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { InventoryTransfer, CreateInventoryTransferRequest } from '@/types/inventoryTransfer'

/**
 * Fetches all inventory transfers.
 *
 * @returns React Query result with transfer array
 * @example
 * const { data: transfers, isLoading } = useInventoryTransfers()
 */
export function useInventoryTransfers(): UseQueryResult<InventoryTransfer[], AxiosError> {
  return useQuery({
    queryKey: ['inventory-transfers'],
    queryFn: async () => {
      const response = await api.get<InventoryTransfer[]>('/v1/inventory-transfers')
      return response.data
    },
  })
}

/**
 * Fetches single inventory transfer by ID.
 *
 * @param id - Transfer identifier
 * @returns React Query result with single transfer
 * @example
 * const { data: transfer } = useInventoryTransferById(1)
 */
export function useInventoryTransferById(id: number | null): UseQueryResult<InventoryTransfer, AxiosError> {
  return useQuery({
    queryKey: ['inventory-transfer', id],
    queryFn: async () => {
      if (!id) throw new Error('Transfer ID is required')
      const response = await api.get<InventoryTransfer>(`/v1/inventory-transfers/${id}`)
      return response.data
    },
    enabled: id !== null,
  })
}

/**
 * Creates a new inventory transfer.
 *
 * @returns Mutation result for creating transfer
 * @example
 * const createMutation = useCreateInventoryTransfer()
 * createMutation.mutate({ productId: 1, fromLocationId: 2, toLocationId: 3, quantity: 10 })
 */
export function useCreateInventoryTransfer(): UseMutationResult<
  InventoryTransfer,
  AxiosError,
  CreateInventoryTransferRequest
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: CreateInventoryTransferRequest) => {
      const response = await api.post<InventoryTransfer>('/v1/inventory-transfers', request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] })
    },
  })
}

/**
 * Completes a requested inventory transfer.
 *
 * @returns Mutation result for completing transfer
 * @example
 * const completeMutation = useCompleteInventoryTransfer()
 * completeMutation.mutate(1)
 */
export function useCompleteInventoryTransfer(): UseMutationResult<InventoryTransfer, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<InventoryTransfer>(`/v1/inventory-transfers/${id}/complete`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] })
    },
  })
}

/**
 * Cancels a requested inventory transfer.
 *
 * @returns Mutation result for cancelling transfer
 * @example
 * const cancelMutation = useCancelInventoryTransfer()
 * cancelMutation.mutate(1)
 */
export function useCancelInventoryTransfer(): UseMutationResult<InventoryTransfer, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<InventoryTransfer>(`/v1/inventory-transfers/${id}/cancel`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transfers'] })
    },
  })
}
