/**
 * React Query hooks for cycle count (재고 실사) management.
 * Provides hooks for fetching, creating, starting, and completing cycle counts.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { CycleCount, CreateCycleCountRequest, CompleteCycleCountRequest } from '@/types/cycleCount'

function normalizeArrayResponse<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data
  }

  if (data && typeof data === 'object' && Array.isArray((data as { content?: unknown }).content)) {
    return (data as { content: T[] }).content
  }

  return []
}

export function useCycleCounts(): UseQueryResult<CycleCount[], AxiosError> {
  return useQuery({
    queryKey: ['cycleCounts'],
    queryFn: async () => {
      const response = await api.get<CycleCount[]>('/v1/cycle-counts')
      return normalizeArrayResponse<CycleCount>(response.data)
    },
  })
}

/**
 * Fetches a single cycle count by ID.
 *
 * @param id - Cycle count identifier
 * @returns React Query result with single cycle count
 * @example
 * const { data: cycleCount } = useCycleCountById(1)
 */
export function useCycleCountById(id: number | null): UseQueryResult<CycleCount, AxiosError> {
  return useQuery({
    queryKey: ['cycleCount', id],
    queryFn: async () => {
      if (!id) throw new Error('Cycle count ID is required')
      const response = await api.get<CycleCount>(`/v1/cycle-counts/${id}`)
      return response.data
    },
    enabled: id !== null,
  })
}

/**
 * Creates a new cycle count.
 *
 * @returns Mutation result for creating cycle count
 * @example
 * const createMutation = useCreateCycleCount()
 * createMutation.mutate({ countDate: '2024-01-01', locationId: 1, inventoryIds: [1, 2, 3] })
 */
export function useCreateCycleCount(): UseMutationResult<CycleCount, AxiosError, CreateCycleCountRequest> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: CreateCycleCountRequest) => {
      const response = await api.post<CycleCount>('/v1/cycle-counts', request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cycleCounts'] })
    },
  })
}

/**
 * Starts a pending cycle count.
 *
 * @returns Mutation result for starting cycle count
 * @example
 * const startMutation = useStartCycleCount()
 * startMutation.mutate(1)
 */
export function useStartCycleCount(): UseMutationResult<CycleCount, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<CycleCount>(`/v1/cycle-counts/${id}/start`)
      return response.data
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['cycleCounts'] })
      queryClient.invalidateQueries({ queryKey: ['cycleCount', id] })
    },
  })
}

/**
 * Completes an in-progress cycle count with actual quantities.
 *
 * @returns Mutation result for completing cycle count
 * @example
 * const completeMutation = useCompleteCycleCount()
 * completeMutation.mutate({ id: 1, request: { items: [{ itemId: 1, actualQuantity: 10 }] } })
 */
export function useCompleteCycleCount(): UseMutationResult<
  CycleCount,
  AxiosError,
  { id: number; request: CompleteCycleCountRequest }
> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, request }: { id: number; request: CompleteCycleCountRequest }) => {
      const response = await api.post<CycleCount>(`/v1/cycle-counts/${id}/complete`, request)
      return response.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cycleCounts'] })
      queryClient.invalidateQueries({ queryKey: ['cycleCount', variables.id] })
    },
  })
}
