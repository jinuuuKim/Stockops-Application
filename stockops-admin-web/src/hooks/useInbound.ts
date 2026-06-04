/**
 * React Query hooks for inbound management.
 * Provides hooks for fetching, creating, and confirming inbounds.
 *
 * @author StockOps Team
 * @since 1.0
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { UseQueryResult, UseMutationResult } from '@tanstack/react-query'
import { AxiosError } from 'axios'
import api from '@/lib/api'
import type { Inbound, InboundItem, CreateInboundRequest, AddInboundItemRequest } from '@/types/inbound'

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
 * Fetches all inbounds with optional status filter.
 *
 * @param status - Optional status filter (DRAFT, CONFIRMED)
 * @returns React Query result with inbound array
 * @example
 * const { data: inbounds, isLoading } = useInbounds('DRAFT')
 */
export function useInbounds(status?: string): UseQueryResult<Inbound[], AxiosError> {
  return useQuery({
    queryKey: ['inbounds', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : ''
      const response = await api.get<Inbound[]>(`/v1/inbounds${params}`)
      return normalizeArrayResponse<Inbound>(response.data)
    },
  })
}

/**
 * Fetches single inbound by ID.
 *
 * @param id - Inbound identifier
 * @returns React Query result with single inbound
 * @example
 * const { data: inbound } = useInboundById(1)
 */
export function useInboundById(id: number | null): UseQueryResult<Inbound, AxiosError> {
  return useQuery({
    queryKey: ['inbound', id],
    queryFn: async () => {
      if (!id) throw new Error('Inbound ID is required')
      const response = await api.get<Inbound>(`/v1/inbounds/${id}`)
      return response.data
    },
    enabled: id !== null,
  })
}

/**
 * Fetches items for a specific inbound.
 *
 * @param inboundId - Inbound identifier
 * @returns React Query result with inbound item array
 * @example
 * const { data: items } = useInboundItems(1)
 */
export function useInboundItems(inboundId: number | null): UseQueryResult<InboundItem[], AxiosError> {
  return useQuery({
    queryKey: ['inbound', inboundId, 'items'],
    queryFn: async () => {
      if (!inboundId) throw new Error('Inbound ID is required')
      const response = await api.get<InboundItem[]>(`/v1/inbounds/${inboundId}/items`)
      return normalizeArrayResponse<InboundItem>(response.data)
    },
    enabled: inboundId !== null,
  })
}

/**
 * Creates a new draft inbound.
 *
 * @returns Mutation result for creating inbound
 * @example
 * const createMutation = useCreateInbound()
 * createMutation.mutate({ supplier: 'ABC Corp' })
 */
export function useCreateInbound(): UseMutationResult<Inbound, AxiosError, CreateInboundRequest> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: CreateInboundRequest) => {
      const response = await api.post<Inbound>('/v1/inbounds', request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbounds'] })
    },
  })
}

/**
 * Adds an item to an existing inbound.
 *
 * @param inboundId - Inbound identifier
 * @returns Mutation result for adding item
 * @example
 * const addItemMutation = useAddInboundItem(1)
 * addItemMutation.mutate({ productId: 1, lotNumber: 'LOT001', quantity: 100, locationId: 1 })
 */
export function useAddInboundItem(inboundId: number): UseMutationResult<InboundItem, AxiosError, AddInboundItemRequest> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (request: AddInboundItemRequest) => {
      const response = await api.post<InboundItem>(`/v1/inbounds/${inboundId}/items`, request)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbound', inboundId, 'items'] })
      queryClient.invalidateQueries({ queryKey: ['inbounds'] })
    },
  })
}

/**
 * Confirms a draft inbound.
 *
 * @returns Mutation result for confirming inbound
 * @example
 * const confirmMutation = useConfirmInbound()
 * confirmMutation.mutate(1)
 */
export function useConfirmInbound(): UseMutationResult<Inbound, AxiosError, number> {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await api.post<Inbound>(`/v1/inbounds/${id}/confirm`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbounds'] })
    },
  })
}
